IPYTHON_CONFIG := /nail/home/syedj/.ipython/profile_default

.PHONY: all
all: clean build develop

.PHONY: develop-notebook
develop-notebook: 
	venv/bin/jupyter notebook

develop:
	source venv/bin/activate
	venv/bin/jupyter lab --watch
.PHONY: build
build: venv frontend-build
	source venv/bin/activate
	venv/bin/pip install -I .
	jupyter labextension install         
	jupyter labextension enable sparkmonitor          
	jupyter serverextension enable --py sparkmonitor
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
	rm -rf node_modules