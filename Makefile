.PHONY: iltorb

%.zip:
	mkdir -p nodejs/node_modules/lambdafs/
	npm pack
	tar --directory nodejs/node_modules/lambdafs/ --extract --file lambdafs-*.tgz --strip-components=1
	rm lambdafs-*.tgz
	mkdir -p $(dir $@)
	zip -9 --filesync --move --recurse-paths $@ nodejs/

iltorb:
	rm --force --recursive "$$PWD/node_modules/iltorb/"
	rm --force --recursive "$$PWD/source/iltorb/"
	docker run \
		--rm \
		--user $$(id -u "$$USER"):$$(id -g "$$USER") \
		--volume "$$PWD/":/srv/lambdafs \
		--workdir /srv/lambdafs node:8.10 \
	npm install --no-shrinkwrap --silent
	mkdir --parents "$$PWD/source/iltorb/build/"
	mv --target-directory="$$PWD/source/iltorb/" \
		"$$PWD/node_modules/iltorb/build/" \
		"$$PWD/node_modules/iltorb/index.js" \
		"$$PWD/node_modules/iltorb/LICENSE"
