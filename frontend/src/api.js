import axios from "axios"

const API_URL = import.meta.env.VITE_API_URL || "https://pesapips-backend.onrender.com"

export const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem("pp_token")
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export default API_URL
