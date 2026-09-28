.PHONY: test dev
test:
	node --test 'collector/test/*.test.js' 'scene/test/*.test.js'
dev:
	node collector/index.js --scene scene
