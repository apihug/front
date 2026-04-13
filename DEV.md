
## keep track in two repository:

1. https://github.com/apihug/front.git
2. https://gitee.com/apihug/front.git



### command

remember to push two git

```shell
git push 
git push --all gitee
```

git config:

```shell
[core]
	repositoryformatversion = 0
	filemode = false
	bare = false
	logallrefupdates = true
	symlinks = false
	ignorecase = true
[remote "origin"]
	url = https://github.com/apihug/front.git
	fetch = +refs/heads/*:refs/remotes/origin/*
[remote "gitee"]
	url = https://gitee.com/apihug/front.git
	fetch = +refs/heads/*:refs/remotes/origin/*
[branch "main"]
	remote = origin
	merge = refs/heads/main
```


## Two ways merger

from  gitee  to github:

```shell
git pull gitee main
git push
```

from github to gitee

```shell
git pull
git push --all gitee
```
