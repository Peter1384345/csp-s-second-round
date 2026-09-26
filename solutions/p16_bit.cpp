#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int n; vector<ll> bit; vector<ll> arr;
void add(int i,ll v){for(;i<=n;i+=i&-i)bit[i]+=v;}
ll sum(int i){ll s=0;for(;i>0;i-=i&-i)s+=bit[i];return s;}
int main(){ios::sync_with_stdio(false);cin.tie(0);
 int q;cin>>n>>q; bit.assign(n+1,0); arr.assign(n+1,0);
 for(int i=1;i<=n;i++){cin>>arr[i];add(i,arr[i]);}
 while(q--){int op;cin>>op; if(op==1){int i;ll x;cin>>i>>x; ll d=x-arr[i]; arr[i]=x; add(i,d);} else {int l,r;cin>>l>>r; cout<<sum(r)-sum(l-1)<<"\n";}}
 return 0;}
