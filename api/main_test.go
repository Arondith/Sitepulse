package main
import "testing"
func TestAuthorization(t *testing.T){
 token:="123456789012345678901234"
 for _,v:=range []struct{header,token string;want bool}{{"Bearer "+token,token,true},{"",token,false},{"Bearer wrong",token,false},{"Bearer short","short",false}}{
  if got:=authorized(v.header,v.token);got!=v.want{t.Errorf("authorization=%v want %v",got,v.want)}
 }
}
