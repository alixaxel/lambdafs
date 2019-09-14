.PHONY: iltorb iltorb@8 iltorb@10

%.zip:
	mkdir -p nodejs/node_modules/lambdafs/
	npm pack
	tar --directory nodejs/node_modules/lambdafs/ --extract --file lambdafs-*.tgz --strip-components=1
	rm lambdafs-*.tgz
	mkdir -p $(dir $@)
	zip -9 --filesync --move --recurse-paths $@ nodejs/

iltorb: iltorb@8 iltorb@10

iltorb@8:
	rm --force --recursive "$$PWD/node_modules/iltorb/"
	rm --force --recursive "$$PWD/source/iltorb/8/"
	docker run \
		--rm \
		--user $$(id -u "$$USER"):$$(id -g "$$USER") \
		--volume "$$PWD/":/srv/lambrda \
		--workdir /srv/lambrda node:8.10 \
	npm install --no-shrinkwrap --silent
	mkdir --parents "$$PWD/source/iltorb/8/build/"
	mv --target-directory="$$PWD/source/iltorb/8/" \
		"$$PWD/node_modules/iltorb/build/" \
		"$$PWD/node_modules/iltorb/index.js" \
		"$$PWD/node_modules/iltorb/LICENSE"

iltorb@10:
	rm --force --recursive "$$PWD/node_modules/iltorb/"
	rm --force --recursive "$$PWD/source/iltorb/10/"
	docker run \
		--rm \
		--user $$(id -u "$$USER"):$$(id -g "$$USER") \
		--volume "$$PWD/":/srv/lambrda \
		--workdir /srv/lambrda node:10.15 \
	npm install --no-shrinkwrap --silent
	mkdir --parents "$$PWD/source/iltorb/10/build/"
	mv --target-directory="$$PWD/source/iltorb/10/" \
		"$$PWD/node_modules/iltorb/build/" \
		"$$PWD/node_modules/iltorb/index.js" \
		"$$PWD/node_modules/iltorb/LICENSE"
