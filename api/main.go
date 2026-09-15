package main

import (
 "context"
 "crypto/rand"
 "crypto/subtle"
 "encoding/json"
 "fmt"
 "log"
 "net/http"
 "net/http/httputil"
 "net/url"
 "os"
 "strings"
 "time"

 "github.com/jackc/pgx/v5/pgxpool"
)

func authorized(header, token string) bool {
 return len(token) >= 24 && subtle.ConstantTimeCompare([]byte(header), []byte("Bearer " + token)) == 1
}
func send(w http.ResponseWriter, status int, data any) {
 w.Header().Set("Content-Type", "application/json")
 w.WriteHeader(status)
 _ = json.NewEncoder(w).Encode(data)
}
func main() {
 token := os.Getenv("API_TOKEN")
 if len(token)<24 { log.Fatal("API_TOKEN must contain at least 24 characters") }
 ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
 defer cancel()
 db, err := pgxpool.New(ctx, os.Getenv("DATABASE_URL")); if err != nil { log.Fatal(err) }; defer db.Close()
 if err = db.Ping(ctx); err != nil { log.Fatal(err) }
 mux := http.NewServeMux()
 mux.HandleFunc("GET /healthz", func(w http.ResponseWriter,r *http.Request) {
  if err:=db.Ping(r.Context());err!=nil {http.Error(w,"database unavailable",503);return};send(w,200,map[string]string{"status":"ok"})
 })
 mux.HandleFunc("GET /api/monitors",func(w http.ResponseWriter,r *http.Request){
  rows,err:=db.Query(r.Context(),"SELECT id,name,url FROM monitors ORDER BY id");if err!=nil{http.Error(w,"database error",500);return};defer rows.Close()
  items:=[]map[string]any{}
  for rows.Next(){var id int;var name,u string;if err:=rows.Scan(&id,&name,&u);err!=nil{http.Error(w,"database error",500);return};items=append(items,map[string]any{"id":id,"name":name,"url":u})}
  if rows.Err()!=nil{http.Error(w,"database error",500);return};send(w,200,items)
 })
 mux.HandleFunc("POST /api/runs",func(w http.ResponseWriter,r *http.Request){
  var body struct{MonitorID int `json:"monitor_id"`}
  dec:=json.NewDecoder(http.MaxBytesReader(w,r.Body,1024));dec.DisallowUnknownFields()
  if dec.Decode(&body)!=nil || body.MonitorID<1 {http.Error(w,"valid monitor_id required",400);return}
  id:=fmt.Sprintf("%x",randomBytes())
  tag,err:=db.Exec(r.Context(),"INSERT INTO runs(id,monitor_id) SELECT $1,id FROM monitors WHERE id=$2",id,body.MonitorID)
  if err!=nil{http.Error(w,"database error",500);return};if tag.RowsAffected()==0{http.Error(w,"monitor not found",404);return}
  send(w,202,map[string]string{"id":id,"state":"queued"})
 })
 mux.HandleFunc("GET /api/runs",func(w http.ResponseWriter,r *http.Request){
  rows,err:=db.Query(r.Context(),`SELECT r.id,m.name,r.state,r.attempts,r.created_at,r.error FROM runs r JOIN monitors m ON m.id=r.monitor_id ORDER BY r.created_at DESC LIMIT 50`)
  if err!=nil{http.Error(w,"database error",500);return};defer rows.Close()
  items:=[]map[string]any{}
  for rows.Next(){var id,name,state string;var attempts int;var created time.Time;var problem *string
   if err:=rows.Scan(&id,&name,&state,&attempts,&created,&problem);err!=nil{http.Error(w,"database error",500);return}
   items=append(items,map[string]any{"id":id,"name":name,"state":state,"attempts":attempts,"created_at":created,"error":problem})
  };if rows.Err()!=nil{http.Error(w,"database error",500);return};send(w,200,items)
 })
 target,err:=url.Parse(os.Getenv("RESULTS_URL"));if err!=nil || target.Host==""{log.Fatal("RESULTS_URL required")}
 proxy:=httputil.NewSingleHostReverseProxy(target)
 proxy.ErrorHandler=func(w http.ResponseWriter,r *http.Request,e error){http.Error(w,"results service unavailable",502)}
 mux.Handle("GET /api/results/",proxy)
 handler:=http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  w.Header().Set("X-Content-Type-Options","nosniff")
  if strings.HasPrefix(r.URL.Path,"/api/") && !authorized(r.Header.Get("Authorization"),token){http.Error(w,"unauthorized",401);return}
  mux.ServeHTTP(w,r)
 })
 srv:=&http.Server{Addr:":8080",Handler:handler,ReadHeaderTimeout:5*time.Second,ReadTimeout:10*time.Second,WriteTimeout:15*time.Second,IdleTimeout:60*time.Second}
 log.Println("SitePulse API on :8080");log.Fatal(srv.ListenAndServe())
}
func randomBytes() []byte {b:=make([]byte,16);if _,err:=rand.Read(b);err!=nil{panic(err)};return b}
