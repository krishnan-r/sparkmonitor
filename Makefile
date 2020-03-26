IPYTHON_CONFIG := /nail/home/syedj/.ipython/profile_default

.PHONY: develop
develop: 
	venv/bin/jupyter notebook

.PHONY: build
build: 
	venv/bin/pip install -I ./extension/.
	jupyter labextension enable sparkmonitor --user           
	jupyter serverextension enable --py --user sparkmonitor
	ipython profile create && echo "c.InteractiveShellApp.extensions.append('sparkmonitor.kernelextension')" >>  $(IPYTHON_CONFIG)/ipython_kernel_config.py

.PHONY: frontend-build
frontend-build:
	npm install
.PHONY: venv
venv: requirements-dev.txt tox.ini
	tox -e venv

.PHONY: clean
clean: 
	rm -rf venv