from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from datetime import datetime, timezone
import re

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.blog import BlogPost

router = APIRouter(prefix="/blog", tags=["blog"])

CATEGORIES = ["Strategy", "Market Analysis", "Education", "Broker Review", "Trade Journal", "General"]

def make_slug(title: str, post_id: int = None) -> str:
    slug = re.sub(r'[^a-z0-9\s-]', '', title.lower())
    slug = re.sub(r'[\s-]+', '-', slug).strip('-')
    slug = slug[:80]
    if post_id:
        slug = f"{slug}-{post_id}"
    return slug

def post_to_dict(post: BlogPost, include_content: bool = False) -> dict:
    return {
        "id":           post.id,
        "title":        post.title,
        "slug":         post.slug,
        "excerpt":      post.excerpt,
        "content":      post.content if include_content else None,
        "category":     post.category,
        "status":       post.status,
        "admin_note":   post.admin_note,
        "is_featured":  post.is_featured,
        "views":        post.views,
        "seo_title":    post.seo_title,
        "seo_desc":     post.seo_desc,
        "created_at":   post.created_at.isoformat(),
        "published_at": post.published_at.isoformat() if post.published_at else None,
        "author_name":  post.author.display_name or post.author.email.split("@")[0] if post.author else "Anonymous",
        "author_plan":  post.author.subscription_plan if post.author else "free",
        "user_id":      post.user_id,
    }

# ── PUBLIC ENDPOINTS ──────────────────────────────────────────────────────────
@router.get("/published")
def get_published_posts(
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = db.query(BlogPost).filter(BlogPost.status == "published")
    if category:
        q = q.filter(BlogPost.category == category)
    if search:
        q = q.filter(or_(
            BlogPost.title.ilike(f"%{search}%"),
            BlogPost.excerpt.ilike(f"%{search}%"),
        ))
    total = q.count()
    posts = q.order_by(BlogPost.is_featured.desc(), BlogPost.published_at.desc()).offset(offset).limit(limit).all()
    return {"total": total, "posts": [post_to_dict(p) for p in posts]}

@router.get("/published/{slug}")
def get_post_by_slug(slug: str, db: Session = Depends(get_db)):
    post = db.query(BlogPost).filter(BlogPost.slug == slug, BlogPost.status == "published").first()
    if not post:
        raise HTTPException(404, "Post not found")
    post.views += 1
    db.commit()
    return post_to_dict(post, include_content=True)

@router.get("/categories")
def get_categories():
    return {"categories": CATEGORIES}

# ── USER ENDPOINTS ────────────────────────────────────────────────────────────
@router.post("/submit")
def submit_post(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    title   = body.get("title", "").strip()
    content = body.get("content", "").strip()
    if not title or len(title) < 10:
        raise HTTPException(400, "Title must be at least 10 characters")
    if not content or len(content) < 200:
        raise HTTPException(400, "Content must be at least 200 characters")

    # Free users: max 2 pending
    plan = current_user.subscription_plan
    if plan == "free":
        pending = db.query(BlogPost).filter(
            BlogPost.user_id == current_user.id,
            BlogPost.status == "pending"
        ).count()
        if pending >= 2:
            raise HTTPException(400, "Free users can have max 2 pending posts. Wait for review.")

    # Auto-generate excerpt if not provided
    excerpt = body.get("excerpt", "")
    if not excerpt:
        excerpt = content[:200].strip() + "..."

    # Generate slug
    base_slug = make_slug(title)
    slug = base_slug
    # Check uniqueness
    i = 1
    while db.query(BlogPost).filter(BlogPost.slug == slug).first():
        slug = f"{base_slug}-{i}"
        i += 1

    post = BlogPost(
        user_id    = current_user.id,
        title      = title,
        slug       = slug,
        excerpt    = excerpt,
        content    = content,
        category   = body.get("category", "General"),
        seo_title  = body.get("seo_title", title),
        seo_desc   = body.get("seo_desc", excerpt[:160]),
        status     = "pending",
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    # Notify admins
    try:
        from app.models.notification import Notification
        from app.models.user import User as U
        admins = db.query(U).filter(U.is_admin == True).all()
        for admin in admins:
            notif = Notification(
                user_id = admin.id,
                type    = "info",
                title   = f"📝 New blog post pending review",
                message = f"{current_user.email} submitted '{title}' for review.",
                read    = False,
            )
            db.add(notif)
        db.commit()
    except: pass

    return {"status": "submitted", "post_id": post.id, "slug": post.slug}

@router.get("/mine")
def get_my_posts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    posts = db.query(BlogPost).filter(BlogPost.user_id == current_user.id)\
        .order_by(BlogPost.created_at.desc()).all()
    return [post_to_dict(p) for p in posts]

@router.put("/mine/{post_id}")
def update_my_post(
    post_id: int,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(BlogPost).filter(BlogPost.id == post_id, BlogPost.user_id == current_user.id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    if post.status == "published":
        raise HTTPException(400, "Published posts cannot be edited. Contact admin.")

    if "title" in body:   post.title   = body["title"]
    if "content" in body: post.content = body["content"]
    if "excerpt" in body: post.excerpt = body["excerpt"]
    if "category" in body: post.category = body["category"]
    post.status = "pending"  # Re-submit for review
    post.admin_note = None
    db.commit()
    return {"status": "resubmitted"}

@router.delete("/mine/{post_id}")
def delete_my_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(BlogPost).filter(BlogPost.id == post_id, BlogPost.user_id == current_user.id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    if post.status == "published":
        raise HTTPException(400, "Cannot delete published posts.")
    db.delete(post)
    db.commit()
    return {"status": "deleted"}

# ── ADMIN ENDPOINTS ───────────────────────────────────────────────────────────
def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(403, "Admin only")
    return current_user

@router.get("/admin/pending")
def admin_pending_posts(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    posts = db.query(BlogPost).filter(BlogPost.status == "pending")\
        .order_by(BlogPost.created_at.asc()).all()
    return [post_to_dict(p, include_content=True) for p in posts]

@router.get("/admin/all")
def admin_all_posts(
    status: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(BlogPost)
    if status:
        q = q.filter(BlogPost.status == status)
    posts = q.order_by(BlogPost.created_at.desc()).limit(100).all()
    return [post_to_dict(p, include_content=True) for p in posts]

@router.post("/admin/{post_id}/approve")
def admin_approve(
    post_id: int,
    body: dict = {},
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")

    post.status       = "published"
    post.published_at = datetime.now(timezone.utc)
    post.is_featured  = body.get("featured", False)
    if "seo_title" in body: post.seo_title = body["seo_title"]
    if "seo_desc"  in body: post.seo_desc  = body["seo_desc"]
    db.commit()

    # Notify author
    try:
        from app.models.notification import Notification
        notif = Notification(
            user_id = post.user_id,
            type    = "signal",
            title   = "✅ Your post was published!",
            message = f"'{post.title}' is now live on the PesaPips blog.",
            read    = False,
        )
        db.add(notif)
        db.commit()
    except: pass

    return {"status": "published", "slug": post.slug}

@router.post("/admin/{post_id}/reject")
def admin_reject(
    post_id: int,
    body: dict,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")

    post.status     = "rejected"
    post.admin_note = body.get("reason", "Does not meet content guidelines.")
    db.commit()

    # Notify author
    try:
        from app.models.notification import Notification
        notif = Notification(
            user_id = post.user_id,
            type    = "warning",
            title   = "❌ Post not approved",
            message = f"'{post.title}' was not approved. Reason: {post.admin_note}",
            read    = False,
        )
        db.add(notif)
        db.commit()
    except: pass

    return {"status": "rejected"}

@router.patch("/admin/{post_id}")
def admin_edit_post(
    post_id: int,
    body: dict,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    for field in ["title","content","excerpt","category","seo_title","seo_desc","is_featured"]:
        if field in body:
            setattr(post, field, body[field])
    db.commit()
    return {"status": "updated"}
