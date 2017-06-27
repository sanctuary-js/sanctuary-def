ESLINT = node_modules/.bin/eslint --config node_modules/sanctuary-style/eslint-es3.json
ISTANBUL = node_modules/.bin/istanbul
NPM = npm
REMARK = node_modules/.bin/remark --frail --no-stdout
REMEMBER_BOWER = node_modules/.bin/remember-bower
TRANSCRIBE = node_modules/.bin/transcribe
XYZ = node_modules/.bin/xyz --repo git@github.com:sanctuary-js/sanctuary-def.git --script scripts/prepublish


.PHONY: all
all: LICENSE README.md

.PHONY: LICENSE
LICENSE:
	cp -- '$@' '$@.orig'
	sed 's/Copyright (c) .* Sanctuary/Copyright (c) $(shell git log --date=short --pretty=format:%ad | sort -r | head -n 1 | cut -d - -f 1) Sanctuary/' '$@.orig' >'$@'
	rm -- '$@.orig'

README.md: index.js
	$(TRANSCRIBE) \
	  --heading-level 4 \
	  --url 'https://github.com/sanctuary-js/sanctuary-def/blob/v$(VERSION)/{filename}#L{line}' \
	  -- $^ \
	| LC_ALL=C sed 's/<h4 name="\(.*\)#\(.*\)">\(.*\)\1#\2/<h4 name="\1.prototype.\2">\3\1#\2/' >'$@'


.PHONY: lint
lint:
	$(ESLINT) \
	  --env es3 \
	  --global define \
	  --global module \
	  --global require \
	  --global self \
	  --rule 'max-len: [error, {code: 79, ignorePattern: "^ *//(# |[.] // |[.]   - <code>)", ignoreUrls: true}]' \
	  --rule 'no-plusplus: [off]' \
	  -- index.js
	$(ESLINT) \
	  --env es6 \
	  --env node \
	  --env mocha \
	  --rule 'dot-notation: [error, {allowKeywords: true}]' \
	  --rule 'max-len: [off]' \
	  -- test
	$(REMEMBER_BOWER) $(shell pwd)
	rm -f README.md
	VERSION=0.0.0 make README.md
	$(REMARK) \
	  --use remark-lint-no-undefined-references \
	  --use remark-lint-no-unused-definitions \
	  -- README.md
	git checkout README.md


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
