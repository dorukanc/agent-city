.PHONY: test dev
test:
	node --test 'collector/test/*.test.js' 'scene/test/*.test.js'
dev: vendor
	node collector/index.js --scene scene

THREE_VERSION := 0.186.1
.PHONY: vendor
vendor: scene/vendor/three/three.module.js
scene/vendor/three/three.module.js:
	rm -rf build/three && mkdir -p build/three scene/vendor/three/addons
	cd build/three && npm pack three@$(THREE_VERSION) --silent >/dev/null && tar xzf three-$(THREE_VERSION).tgz
	cp build/three/package/build/three.module.js build/three/package/build/three.core.js build/three/package/LICENSE scene/vendor/three/
	cp -R build/three/package/examples/jsm/postprocessing build/three/package/examples/jsm/shaders scene/vendor/three/addons/
