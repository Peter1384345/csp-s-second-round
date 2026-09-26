#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(0);
 int n,k;cin>>n>>k; vector<long long> L(n); long long hi=0;
 for(int i=0;i<n;i++){cin>>L[i]; hi=max(hi,L[i]);}
 long long lo=0,ans=0;
 while(lo<=hi){long long mid=(lo+hi)/2; if(mid==0) break; long long cnt=0; for(auto x:L) cnt+=x/mid; if(cnt>=k){ans=mid; lo=mid+1;} else hi=mid-1;}
 cout<<ans<<"\n"; return 0;}
