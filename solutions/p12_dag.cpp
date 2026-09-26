#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(0);
 int n,m;cin>>n>>m; vector<vector<pair<int,long long>>> g(n+1); vector<int> indeg(n+1,0);
 for(int i=0;i<m;i++){int u,v;long long w;cin>>u>>v>>w;g[u].push_back({v,w});indeg[v]++;}
 const long long NEG=-1e18; vector<long long> dp(n+1,NEG); dp[1]=0;
 queue<int> q; for(int i=1;i<=n;i++) if(indeg[i]==0) q.push(i);
 while(!q.empty()){int u=q.front();q.pop(); for(auto [v,w]:g[u]){ if(dp[u]!=NEG) dp[v]=max(dp[v],dp[u]+w); if(--indeg[v]==0) q.push(v);}}
 if(dp[n]==NEG) cout<<-1<<"\n"; else cout<<dp[n]<<"\n"; return 0;}
