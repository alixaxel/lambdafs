.PHONY: clean

clean:
	rm -f $(lastword $(MAKECMDGOALS))

%.zip:
	mkdir -p nodejs/node_modules/lambdafs/
	npm pack
	tar --directory nodejs/node_modules/lambdafs/ --extract --file lambdafs-*.tgz --strip-components=1
	rm lambdafs-*.tgz
	mkdir -p $(dir $@)
	zip -9 --filesync --move --recurse-paths $@ nodejs/

.DEFAULT_GOAL := lambdafs.zip
