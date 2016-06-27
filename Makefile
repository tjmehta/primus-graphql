build:
	mkdir -p lib && cp ./src/* ./lib/ && \
	browserify -t browserify-istanbul ./src/primus-graphql.client.js > ./lib/primus-graphql.client.js.tmp; \
	( \
		echo 'module.exports = function (primus, primusOpts) {\n'; \
		cat ./lib/primus-graphql.client.js.tmp; \
		echo "\n}\n" \
	) > ./lib/primus-graphql.client.js; \
	rm ./lib/primus-graphql.client.js.tmp;
build-browser:
	make build && \
	node ./scripts/build-primus-client.js