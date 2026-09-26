#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(0);
 int n,C;cin>>n>>C; vector<long long> dp(C+1,0);
 for(int i=0;i<n;i++){int w,v;cin>>w>>v; for(int c=C;c>=w;c--) dp[c]=max(dp[c],dp[c-w]+v);}
 cout<<dp[C]<<"\n"; return 0;}
