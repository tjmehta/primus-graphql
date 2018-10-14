build:
	rm -rf ./lib && mkdir -p lib; \
	cp -r ./src/*.js ./lib/ && \
	mkdir -p lib/client && cp -r ./src/client/*.js ./lib/client/ && \
	mkdir -p lib/server && cp -r ./src/server/*.js ./lib/server/ && \
	mkdir -p lib/shared && cp -r ./src/shared/*.js ./lib/shared/ && \
	browserify ./src/primus-graphql.client.js > ./lib/primus-graphql.client.js.tmp; \
	( \
		echo 'module.exports = function (primus, primusOpts) {\n'; \
		cat ./lib/primus-graphql.client.js.tmp; \
		echo "\n}\n" \
	) > ./lib/primus-graphql.client.js; \
	rm ./lib/primus-graphql.client.js.tmp;
build-browser:
	make build && \
	node ./scripts/build-graphql-schema.js && \
	relay-compiler --src ./__browser_tests__/fixtures/relay-app --schema ./__browser_tests__/fixtures/graphql-schema.graphql && \
	node ./scripts/build-primus-client.js
