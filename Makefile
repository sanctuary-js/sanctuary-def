ESLINT = node_modules/.bin/eslint --config node_modules/sanctuary-style/eslint-es3.json --env es3
ISTANBUL = node_modules/.bin/istanbul
NPM = npm
XYZ = node_modules/.bin/xyz --repo git@github.com:sanctuary-js/sanctuary-def.git


.PHONY: all
all:


.PHONY: lint
lint:
	$(ESLINT) \
	  --global define \
	  --global module \
	  --global self \
	  -- index.js
	$(ESLINT) \
	  --env node \
	  --env mocha \
	  --rule 'dot-notation: [error, {allowKeywords: true}]' \
	  --rule 'max-len: [off]' \
	  -- test


.PHONY: release-major release-minor release-patch
release-major release-minor release-patch:
	@$(XYZ) --increment $(@:release-%=%)


.PHONY: setup
setup:
	$(NPM) install


.PHONY: test
test:
	$(ISTANBUL) cover node_modules/.bin/_mocha -- --recursive
	$(ISTANBUL) check-coverage --branches 100
