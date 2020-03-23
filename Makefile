IPYTHON_CONFIG := /nail/home/syedj/.ipython/profile_default

.PHONY: develop
develop: 
	venv/bin/jupyter notebook

.PHONY: build
build: 
	venv/bin/pip install -I ./extension/.
	jupyter nbextension install sparkmonitor --py --user --symlink 
	jupyter nbextension enable sparkmonitor --py --user            
	jupyter serverextension enable --py --user sparkmonitor
	ipython profile create && echo "c.InteractiveShellApp.extensions.append('sparkmonitor.kernelextension')" >>  $(IPYTHON_CONFIG)/ipython_kernel_config.py

.PHONY: venv
venv: requirements-dev.txt tox.ini
	tox -e venv