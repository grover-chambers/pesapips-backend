//+------------------------------------------------------------------+
//|  PesaPips Bridge EA v2.0 - File-based IPC                       |
//|  Uses files for communication (works on all MT5 builds)         |
//+------------------------------------------------------------------+
#property strict
#include <Trade\Trade.mqh>

input string DataFolder = "PesaPips";  // Subfolder in MQL5/Files

CTrade trade;
string cmd_file;
string rsp_file;
string hbt_file;

//+------------------------------------------------------------------+
int OnInit() {
   trade.SetExpertMagicNumber(20250101);
   trade.SetDeviationInPoints(10);
   
   cmd_file = DataFolder + "\\command.txt";
   rsp_file = DataFolder + "\\response.txt";
   hbt_file = DataFolder + "\\heartbeat.txt";
   
   // Create folder
   if(!FolderCreate(DataFolder, FILE_COMMON)) {
      // Folder may already exist, that's OK
   }
   
   // Write initial heartbeat
   WriteFile(hbt_file, "ready|" + IntegerToString(TimeCurrent()));
   
   EventSetMillisecondTimer(200);
   Print("PesaPips Bridge v2.0 started. Data folder: ", TerminalInfoString(TERMINAL_COMMONDATA_PATH), "\\Files\\", DataFolder);
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason) {
   EventKillTimer();
   WriteFile(hbt_file, "stopped|" + IntegerToString(TimeCurrent()));
   Print("PesaPips Bridge stopped");
}

//+------------------------------------------------------------------+
void OnTimer() {
   // Update heartbeat every tick
   WriteFile(hbt_file, "ready|" + IntegerToString(TimeCurrent()));
   
   // Check for command
   if(!FileIsExist(cmd_file, FILE_COMMON)) return;
   
   string request = ReadFile(cmd_file);
   if(StringLen(request) == 0) return;
   
   // Delete command file immediately
   FileDelete(cmd_file, FILE_COMMON);
   
   // Process and write response
   string response = ProcessCommand(request);
   WriteFile(rsp_file, response);
   
   Print("CMD: ", request, " | RSP: ", response);
}

void OnTick() { }

//+------------------------------------------------------------------+
string ReadFile(string filename) {
   int handle = FileOpen(filename, FILE_READ|FILE_TXT|FILE_COMMON|FILE_ANSI);
   if(handle == INVALID_HANDLE) return "";
   string content = "";
   while(!FileIsEnding(handle))
      content += FileReadString(handle);
   FileClose(handle);
   return content;
}

void WriteFile(string filename, string content) {
   int handle = FileOpen(filename, FILE_WRITE|FILE_TXT|FILE_COMMON|FILE_ANSI);
   if(handle == INVALID_HANDLE) return;
   FileWriteString(handle, content);
   FileClose(handle);
}

//+------------------------------------------------------------------+
string ProcessCommand(string req) {
   string action = JsonGetString(req, "action");
   if(action == "PING")      return "{\"status\":\"ok\",\"message\":\"pong\"}";
   if(action == "BALANCE")   return GetBalance();
   if(action == "POSITIONS") return GetPositions();
   if(action == "HISTORY")   return GetHistory();
   if(action == "BUY")       return OpenTrade(req, ORDER_TYPE_BUY);
   if(action == "SELL")      return OpenTrade(req, ORDER_TYPE_SELL);
   if(action == "CLOSE")     return CloseTrade(req);
   if(action == "CLOSE_ALL") return CloseAllTrades();
   if(action == "CANDLES")   return GetCandles(req);
   if(action == "WATCH")     return GetMarketWatch();
   return "{\"status\":\"error\",\"message\":\"Unknown action\"}";
}

//+------------------------------------------------------------------+
string GetBalance() {
   return "{\"status\":\"ok\""
      ",\"balance\":"     + DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE),2)
    + ",\"equity\":"      + DoubleToString(AccountInfoDouble(ACCOUNT_EQUITY),2)
    + ",\"margin\":"      + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN),2)
    + ",\"free_margin\":" + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN_FREE),2)
    + ",\"profit\":"      + DoubleToString(AccountInfoDouble(ACCOUNT_PROFIT),2)
    + ",\"currency\":\""  + AccountInfoString(ACCOUNT_CURRENCY) + "\""
    + ",\"server\":\""    + AccountInfoString(ACCOUNT_SERVER) + "\""
    + ",\"login\":"       + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN))
    + "}";
}

//+------------------------------------------------------------------+
string GetPositions() {
   string r = "{\"status\":\"ok\",\"positions\":[";
   int total = PositionsTotal();
   for(int i = 0; i < total; i++) {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(i > 0) r += ",";
      r += "{\"ticket\":"        + IntegerToString(ticket)
         + ",\"symbol\":\""      + PositionGetString(POSITION_SYMBOL) + "\""
         + ",\"type\":\""        + (PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_BUY?"BUY":"SELL") + "\""
         + ",\"volume\":"        + DoubleToString(PositionGetDouble(POSITION_VOLUME),2)
         + ",\"open_price\":"    + DoubleToString(PositionGetDouble(POSITION_PRICE_OPEN),5)
         + ",\"current_price\":" + DoubleToString(PositionGetDouble(POSITION_PRICE_CURRENT),5)
         + ",\"sl\":"            + DoubleToString(PositionGetDouble(POSITION_SL),5)
         + ",\"tp\":"            + DoubleToString(PositionGetDouble(POSITION_TP),5)
         + ",\"profit\":"        + DoubleToString(PositionGetDouble(POSITION_PROFIT),2)
         + ",\"swap\":"          + DoubleToString(PositionGetDouble(POSITION_SWAP),2)
         + ",\"open_time\":"     + IntegerToString(PositionGetInteger(POSITION_TIME))
         + "}";
   }
   return r + "]}";
}

//+------------------------------------------------------------------+
string GetHistory() {
   HistorySelect(TimeCurrent()-30*24*3600, TimeCurrent());
   int total = HistoryDealsTotal();
   string r = "{\"status\":\"ok\",\"deals\":[";
   int count = 0;
   for(int i = MathMax(0,total-100); i < total; i++) {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket==0) continue;
      if(HistoryDealGetInteger(ticket,DEAL_ENTRY)!=DEAL_ENTRY_OUT) continue;
      if(count > 0) r += ",";
      r += "{\"ticket\":"   + IntegerToString(ticket)
         + ",\"symbol\":\"" + HistoryDealGetString(ticket,DEAL_SYMBOL) + "\""
         + ",\"type\":\""   + (HistoryDealGetInteger(ticket,DEAL_TYPE)==DEAL_TYPE_BUY?"BUY":"SELL") + "\""
         + ",\"volume\":"   + DoubleToString(HistoryDealGetDouble(ticket,DEAL_VOLUME),2)
         + ",\"price\":"    + DoubleToString(HistoryDealGetDouble(ticket,DEAL_PRICE),5)
         + ",\"profit\":"   + DoubleToString(HistoryDealGetDouble(ticket,DEAL_PROFIT),2)
         + ",\"time\":"     + IntegerToString(HistoryDealGetInteger(ticket,DEAL_TIME))
         + "}";
      count++;
   }
   return r + "]}";
}

//+------------------------------------------------------------------+
string OpenTrade(string req, ENUM_ORDER_TYPE type) {
   string symbol  = JsonGetString(req,"symbol");
   double volume  = JsonGetDouble(req,"volume");
   double sl      = JsonGetDouble(req,"sl");
   double tp      = JsonGetDouble(req,"tp");
   string comment = JsonGetString(req,"comment");
   if(symbol=="")  symbol="XAUUSD";
   if(volume<=0)   volume=0.01;
   if(comment=="") comment="PesaPips";
   double price = (type==ORDER_TYPE_BUY) ?
      SymbolInfoDouble(symbol,SYMBOL_ASK) :
      SymbolInfoDouble(symbol,SYMBOL_BID);
   bool ok = (type==ORDER_TYPE_BUY) ?
      trade.Buy(volume,symbol,price,sl,tp,comment) :
      trade.Sell(volume,symbol,price,sl,tp,comment);
   if(ok)
      return "{\"status\":\"ok\",\"ticket\":" + IntegerToString(trade.ResultOrder())
           + ",\"price\":"  + DoubleToString(trade.ResultPrice(),5) + "}";
   else
      return "{\"status\":\"error\",\"code\":" + IntegerToString(trade.ResultRetcode())
           + ",\"message\":\"" + trade.ResultComment() + "\"}";
}

//+------------------------------------------------------------------+
string CloseTrade(string req) {
   ulong ticket = (ulong)StringToInteger(JsonGetString(req,"ticket"));
   if(ticket==0) return "{\"status\":\"error\",\"message\":\"Invalid ticket\"}";
   if(!PositionSelectByTicket(ticket))
      return "{\"status\":\"error\",\"message\":\"Position not found\"}";
   bool ok = trade.PositionClose(ticket,10);
   if(ok)
      return "{\"status\":\"ok\",\"ticket\":" + IntegerToString(ticket) + "}";
   else
      return "{\"status\":\"error\",\"message\":\"" + trade.ResultComment() + "\"}";
}

//+------------------------------------------------------------------+
string CloseAllTrades() {
   int closed=0, total=PositionsTotal();
   for(int i=total-1;i>=0;i--) {
      ulong ticket=PositionGetTicket(i);
      if(ticket==0) continue;
      if(trade.PositionClose(ticket,10)) closed++;
   }
   return "{\"status\":\"ok\",\"closed\":" + IntegerToString(closed) + "}";
}


//+------------------------------------------------------------------+
string GetPrices(string req) {
   // Default symbols if none specified
   string symbols = "XAUUSD,XAGUSD,EURUSD,GBPUSD,USDJPY,BTCUSD,ETHUSD,USDCHF,AUDUSD,USOIL,NAS100,US30,SPX500,DXY,USDKES";
   
   string r = "{\"status\":\"ok\",\"prices\":[";
   string arr[];
   int count = StringSplit(symbols, ',', arr);
   bool first = true;
   
   for(int i = 0; i < count; i++) {
      string sym = arr[i];
      // Try to get symbol info
      double bid = SymbolInfoDouble(sym, SYMBOL_BID);
      double ask = SymbolInfoDouble(sym, SYMBOL_ASK);
      if(bid <= 0) continue; // Symbol not available
      
      double change = bid - SymbolInfoDouble(sym, SYMBOL_SESSION_CLOSE);
      double change_pct = SymbolInfoDouble(sym, SYMBOL_SESSION_CLOSE) > 0 ? 
         (change / SymbolInfoDouble(sym, SYMBOL_SESSION_CLOSE) * 100) : 0;
      int digits = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);
      
      if(!first) r += ",";
      r += "{\"s\":\"" + sym + "\""
         + ",\"bid\":" + DoubleToString(bid, digits)
         + ",\"ask\":" + DoubleToString(ask, digits)
         + ",\"change\":" + DoubleToString(change, digits)
         + ",\"change_pct\":" + DoubleToString(change_pct, 4)
         + ",\"digits\":" + IntegerToString(digits)
         + "}";
      first = false;
   }
   
   r += "]}";
   return r;
}


//+------------------------------------------------------------------+
string GetCandles(string req) {
   string symbol    = JsonGetString(req, "symbol");
   string tf_str    = JsonGetString(req, "timeframe");
   int    periods   = (int)JsonGetDouble(req, "periods");
   
   if(symbol == "")   symbol  = "XAUUSD";
   if(tf_str == "")   tf_str  = "M5";
   if(periods <= 0)   periods = 80;
   if(periods > 2000) periods = 2000;
   
   ENUM_TIMEFRAMES tf = PERIOD_M5;
   if(tf_str == "M1")  tf = PERIOD_M1;
   if(tf_str == "M5")  tf = PERIOD_M5;
   if(tf_str == "M15") tf = PERIOD_M15;
   if(tf_str == "M30") tf = PERIOD_M30;
   if(tf_str == "H1")  tf = PERIOD_H1;
   if(tf_str == "H4")  tf = PERIOD_H4;
   if(tf_str == "D1")  tf = PERIOD_D1;
   
   MqlRates rates[];
   int copied = CopyRates(symbol, tf, 0, periods, rates);
   
   if(copied <= 0)
      return "{\"status\":\"error\",\"message\":\"No data\"}";
   
   string r = "{\"status\":\"ok\",\"candles\":[";
   for(int i = 0; i < copied; i++) {
      if(i > 0) r += ",";
      r += "{\"t\":" + IntegerToString(rates[i].time)
         + ",\"o\":" + DoubleToString(rates[i].open, 5)
         + ",\"h\":" + DoubleToString(rates[i].high, 5)
         + ",\"l\":" + DoubleToString(rates[i].low, 5)
         + ",\"c\":" + DoubleToString(rates[i].close, 5)
         + ",\"v\":" + IntegerToString(rates[i].tick_volume)
         + "}";
   }
   r += "]}";
   return r;
}


//+------------------------------------------------------------------+
string GetMarketWatch() {
   string r = "{\"status\":\"ok\",\"assets\":[";
   bool first = true;
   
   // Get all symbols in Market Watch
   int total = SymbolsTotal(true); // true = only Market Watch symbols
   
   for(int i = 0; i < total; i++) {
      string sym = SymbolName(i, true);
      if(sym == "") continue;
      
      double bid  = SymbolInfoDouble(sym, SYMBOL_BID);
      double ask  = SymbolInfoDouble(sym, SYMBOL_ASK);
      if(bid <= 0) continue;
      
      double close_prev = SymbolInfoDouble(sym, SYMBOL_SESSION_CLOSE);
      double change     = close_prev > 0 ? bid - close_prev : 0;
      double change_pct = close_prev > 0 ? (change / close_prev * 100) : 0;
      int    digits     = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);
      
      if(!first) r += ",";
      r += "{\"symbol\":\"" + sym + "\""
         + ",\"bid\":" + DoubleToString(bid, digits)
         + ",\"ask\":" + DoubleToString(ask, digits)
         + ",\"change\":" + DoubleToString(change, digits)
         + ",\"change_pct\":" + DoubleToString(change_pct, 4)
         + ",\"digits\":" + IntegerToString(digits)
         + "}";
      first = false;
   }
   
   r += "]}";
   return r;
}

//+------------------------------------------------------------------+
string JsonGetString(string json, string key) {
   string search = "\""+key+"\":\"";
   int start = StringFind(json,search);
   if(start<0) return "";
   start += StringLen(search);
   int end = StringFind(json,"\"",start);
   if(end<0) return "";
   return StringSubstr(json,start,end-start);
}

double JsonGetDouble(string json, string key) {
   string search = "\""+key+"\":";
   int start = StringFind(json,search);
   if(start<0) return 0.0;
   start += StringLen(search);
   if(StringSubstr(json,start,1)=="\"") start++;
   int end=start;
   while(end<StringLen(json)) {
      string ch=StringSubstr(json,end,1);
      if(ch==","||ch=="}"||ch=="\""||ch==" ") break;
      end++;
   }
   return StringToDouble(StringSubstr(json,start,end-start));
}
//+------------------------------------------------------------------+
