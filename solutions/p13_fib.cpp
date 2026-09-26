#include <bits/stdc++.h>
using namespace std;
typedef long long ll; const ll MOD=1000000007LL;
struct M{ll a[2][2];};
M mul(M x,M y){M r; r.a[0][0]=0;r.a[0][1]=0;r.a[1][0]=0;r.a[1][1]=0; for(int i=0;i<2;i++)for(int j=0;j<2;j++)for(int k=0;k<2;k++) r.a[i][j]=(r.a[i][j]+x.a[i][k]*y.a[k][j])%MOD; return r;}
int main(){ios::sync_with_stdio(false);cin.tie(0);
 ll n;cin>>n; if(n==1||n==2){cout<<1<<"\n";return 0;}
 M base; base.a[0][0]=1;base.a[0][1]=1;base.a[1][0]=1;base.a[1][1]=0;
 M res; res.a[0][0]=1;res.a[0][1]=0;res.a[1][0]=0;res.a[1][1]=1;
 ll e=n-2; while(e){ if(e&1)res=mul(res,base); base=mul(base,base); e>>=1; }
 ll ans=(res.a[0][0]+res.a[0][1])%MOD; cout<<ans<<"\n"; return 0;}
