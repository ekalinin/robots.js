.PHONY: deploy deploy-github deploy-npm test

test:
	@expresso tests/*

deploy-github:
	@git tag `grep "version" package.json | grep -o -E '[0-9]\.[0-9]\.[0-9]{1,2}'`
	@git push --tags origin master

deploy-npm:
	@npm publish

deploy: test deploy-github deploy-npm
