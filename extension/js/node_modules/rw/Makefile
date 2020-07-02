.PHONY: all clean test

all:

clean:

test/input.txt: Makefile
	rm -f $@
	for i in {1..10000}; do printf '%09X\n' $$RANDOM >> $@; done

test: test/input.txt test/file-reader.test
	[ "$$(test/wc-async < $<)" = "100000" ]
	[ "$$(test/wc-sync < $<)" = "100000" ]
	[ "$$(test/wc-async $<)" = "100000" ]
	[ "$$(test/wc-sync $<)" = "100000" ]
	[ "$$(cat $< | test/wc-async)" = "100000" ]
	[ "$$(cat $< | test/wc-sync)" = "100000" ]
	[ "$$(test/cat-async $< | wc -c | tr -d ' ')" = "100000" ]
	[ "$$(test/cat-async $< | wc -c | tr -d ' ')" = "100000" ]
	[ "$$(test/cat-sync $< | wc -c | tr -d ' ')" = "100000" ]
	[ "$$(test/cat-sync $< | wc -c | tr -d ' ')" = "100000" ]
	[ "$$(test/cat-async $< | test/wc-async)" = "100000" ]
	[ "$$(test/cat-async $< | test/wc-sync)" = "100000" ]
	[ "$$(test/cat-sync $< | test/wc-async)" = "100000" ]
	[ "$$(test/cat-sync $< | test/wc-sync)" = "100000" ]
	[ "$$(test/cat-async < $< | wc -c | tr -d ' ')" = "100000" ]
	[ "$$(test/cat-async < $< | wc -c | tr -d ' ')" = "100000" ]
	[ "$$(test/cat-sync < $< | wc -c | tr -d ' ')" = "100000" ]
	[ "$$(test/cat-sync < $< | wc -c | tr -d ' ')" = "100000" ]
	[ "$$(test/cat-async < $< | test/wc-async)" = "100000" ]
	[ "$$(test/cat-async < $< | test/wc-sync)" = "100000" ]
	[ "$$(test/cat-sync < $< | test/wc-async)" = "100000" ]
	[ "$$(test/cat-sync < $< | test/wc-sync)" = "100000" ]
	[ "$$(test/cat-reader < $< | test/wc-sync)" = "100000" ]
	[ "$$(test/cat-reader-writer < $< | test/wc-sync)" = "100000" ]
	[ "$$(test/cat-line-parser < $< | test/wc-sync)" = "100000" ]
	[ "$$(cat $< | test/cat-async | test/wc-async)" = "100000" ]
	[ "$$(cat $< | test/cat-async | test/wc-sync)" = "100000" ]
	[ "$$(cat $< | test/cat-sync | test/wc-async)" = "100000" ]
	[ "$$(cat $< | test/cat-sync | test/wc-sync)" = "100000" ]
	[ "$$(cat $< | test/cat-async | head -n 100 | test/wc-async)" = "1000" ]
	[ "$$(cat $< | test/cat-async | head -n 100 | test/wc-sync)" = "1000" ]
	[ "$$(cat $< | test/cat-sync | head -n 100 | test/wc-async)" = "1000" ]
	[ "$$(cat $< | test/cat-sync | head -n 100 | test/wc-sync)" = "1000" ]
	[ "$$(cat $< | head -n 100 | test/cat-async | test/wc-async)" = "1000" ]
	[ "$$(cat $< | head -n 100 | test/cat-async | test/wc-sync)" = "1000" ]
	[ "$$(cat $< | head -n 100 | test/cat-sync | test/wc-async)" = "1000" ]
	[ "$$(cat $< | head -n 100 | test/cat-sync | test/wc-sync)" = "1000" ]

test/file-reader.test: test/input.txt
	test/cat-fixed-reader $< $@.out
	diff $< $@.out
	rm $@.out
