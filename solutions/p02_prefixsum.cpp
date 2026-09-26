#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(0);
 int n,m;cin>>n>>m; vector<long long> a(n+1,0),pre(n+1,0);
 for(int i=1;i<=n;i++){cin>>a[i]; pre[i]=pre[i-1]+a[i];}
 while(m--){int l,r;cin>>l>>r; cout<<pre[r]-pre[l-1]<<"\n";}
 return 0;}
