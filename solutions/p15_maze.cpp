#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(0);
 int n,m;cin>>n>>m; vector<string> g(n); for(int i=0;i<n;i++)cin>>g[i];
 int dx[4]={1,-1,0,0}, dy[4]={0,0,1,-1};
 vector<vector<int>> dist(n,vector<int>(m,-1)); dist[0][0]=0; queue<pair<int,int>>q; q.push({0,0});
 while(!q.empty()){auto [x,y]=q.front();q.pop(); for(int k=0;k<4;k++){int nx=x+dx[k],ny=y+dy[k]; if(nx<0||nx>=n||ny<0||ny>=m)continue; if(g[nx][ny]=='1')continue; if(dist[nx][ny]<0){dist[nx][ny]=dist[x][y]+1; q.push({nx,ny});}}}
 cout<<dist[n-1][m-1]<<"\n"; return 0;}
