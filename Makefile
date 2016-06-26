build:
	mkdir -p lib && cp ./src/* ./lib/ && \
	( \
		echo 'module.exports = function (primus, primusOpts) {\n'; \
		browserify ./src/primus-graphql.client.js; \
		echo "\n}\n" \
	) > ./lib/primus-graphql.client.js
build-browser:
	make build && \
	node ./scripts/build-primus-client.js