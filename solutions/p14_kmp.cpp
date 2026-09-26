#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(0);
 string s,t;cin>>s>>t; int ns=s.size(), nt=t.size();
 vector<int> pi(nt); for(int i=1;i<nt;i++){int j=pi[i-1]; while(j>0&&t[i]!=t[j])j=pi[j-1]; if(t[i]==t[j])j++; pi[i]=j;}
 int cnt=0,j=0; for(int i=0;i<ns;i++){ while(j>0&&s[i]!=t[j])j=pi[j-1]; if(s[i]==t[j])j++; if(j==nt){cnt++; j=pi[j-1];} }
 cout<<cnt<<"\n"; return 0;}
