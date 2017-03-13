ESLINT = node_modules/.bin/eslint --config node_modules/sanctuary-style/eslint-es3.json --env es3
ISTANBUL = node_modules/.bin/istanbul
REMEMBER_BOWER = node_modules/.bin/remember-bower
TRANSCRIBE = node_modules/.bin/transcribe
XYZ = node_modules/.bin/xyz --repo git@github.com:sanctuary-js/sanctuary-def.git --script scripts/prepublish
YARN = yarn


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
	  --global define \
	  --global module \
	  --global require \
	  --global self \
	  --rule 'max-len: [error, {code: 79, ignorePattern: "^ *//(# |[.] // |[.]   - <code>)", ignoreUrls: true}]' \
	  -- index.js
	$(ESLINT) \
	  --env node \
	  --env mocha \
	  --rule 'dot-notation: [error, {allowKeywords: true}]' \
	  --rule 'max-len: [off]' \
	  -- test
	$(REMEMBER_BOWER) $(shell pwd)
	@echo 'Checking for missing link definitions...'
	grep '^[ ]*//[.]' index.js \
	| grep -o '\[[^]]*\]\[[^]]*\]' \
	| sed -n -e 's:\[\(.*\)\]\[\]:\1:p' -e 's:\[.*\]\[\(.*\)\]:\1:p' \
	| sort -u \
	| xargs -I '{}' sh -c "grep '^//[.] \[{}\]: ' index.js"


.PHONY: release-major release-minor release-patch
release-major release-minor release-patch:
	@$(XYZ) --increment $(@:release-%=%)


.PHONY: setup
setup:
	$(YARN)

yarn.lock: package.json
	$(YARN)


.PHONY: test
test:
	$(ISTANBUL) cover node_modules/.bin/_mocha -- --recursive
	$(ISTANBUL) check-coverage --branches 100
