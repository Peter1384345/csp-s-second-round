#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(0);
 int n;cin>>n; vector<pair<int,int>> a(n);
 for(int i=0;i<n;i++){cin>>a[i].second>>a[i].first;} // sort by end time
 sort(a.begin(),a.end());
 int last=-1e9, cnt=0;
 for(auto &p:a){ if(p.second>=last){cnt++; last=p.first;} }
 cout<<cnt<<"\n"; return 0;}
