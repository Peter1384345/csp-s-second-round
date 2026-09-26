#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(0);
 int n;cin>>n; vector<long long> h(n+2,0);
 for(int i=1;i<=n;i++) cin>>h[i];
 stack<int> st; st.push(0); long long ans=0;
 for(int i=1;i<=n+1;i++){
   while(!st.empty() && h[st.top()]>h[i]){
     long long ht=h[st.top()]; st.pop();
     long long w=i-st.top()-1; ans=max(ans,ht*w);
   }
   st.push(i);
 }
 cout<<ans<<"\n"; return 0;}
