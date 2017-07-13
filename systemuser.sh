#!/bin/sh

# Author: Danilo Piparo, Enric Tejedor 2016
# Copyright CERN
# Here the environment for the notebook server is prepared. Many of the commands are launched as regular 
# user as it's this entity which is able to access eos and not the super user.

# Create notebook user
# The $HOME directory is specified upstream in the Spawner
echo "Creating user $USER ($USER_ID) with home $HOME"
export SWAN_HOME=$HOME
if [[ $SWAN_HOME == /eos/user/* ]]; then export CERNBOX_HOME=$SWAN_HOME; fi
useradd -u $USER_ID -s $SHELL -d $SWAN_HOME $USER
SCRATCH_HOME=/scratch/$USER
mkdir -p $SCRATCH_HOME
echo "This directory is temporary and will be deleted when your SWAN session ends!" > $SCRATCH_HOME/IMPORTANT.txt
chown -R $USER:$USER $SCRATCH_HOME

# Setup the LCG View on CVMFS
echo "Setting up environment from CVMFS"
export LCG_VIEW=$ROOT_LCG_VIEW_PATH/$ROOT_LCG_VIEW_NAME/$ROOT_LCG_VIEW_PLATFORM

# Set environment for the Jupyter process
echo "Setting Jupyter environment"
JPY_DIR=$SCRATCH_HOME/.jupyter
mkdir -p $JPY_DIR
JPY_LOCAL_DIR=$SCRATCH_HOME/.local
mkdir -p $JPY_LOCAL_DIR
export JUPYTER_CONFIG_DIR=$JPY_DIR
# Our kernels will be in $JPY_LOCAL_DIR/share/jupyter, $LCG_VIEW/share/jupyter is needed for the notebook extensions
export JUPYTER_PATH=$JPY_LOCAL_DIR/share/jupyter:$LCG_VIEW/share/jupyter
export KERNEL_DIR=$JPY_LOCAL_DIR/share/jupyter/kernels
mkdir -p $KERNEL_DIR
export JUPYTER_RUNTIME_DIR=$JPY_LOCAL_DIR/share/jupyter/runtime
export IPYTHONDIR=$SCRATCH_HOME/.ipython
# This avoids to create hardlinks on eos when using pip
export XDG_CACHE_HOME=/tmp/$USER/.cache/
JPY_CONFIG=$JUPYTER_CONFIG_DIR/jupyter_notebook_config.py
echo "c.FileCheckpoints.checkpoint_dir = '$SCRATCH_HOME/.ipynb_checkpoints'"         >> $JPY_CONFIG
echo "c.NotebookNotary.db_file = '$JPY_LOCAL_DIR/share/jupyter/nbsignatures.db'"     >> $JPY_CONFIG
echo "c.NotebookNotary.secret_file = '$JPY_LOCAL_DIR/share/jupyter/notebook_secret'" >> $JPY_CONFIG
cp -L -r $LCG_VIEW/etc/jupyter/* $JUPYTER_CONFIG_DIR

# Configure %%cpp cell highlighting
CUSTOM_JS_DIR=$JPY_DIR/custom
mkdir $CUSTOM_JS_DIR
echo "
require(['notebook/js/codecell'], function(codecell) {
  codecell.CodeCell.options_default.highlight_modes['magic_text/x-c++src'] = {'reg':[/^%%cpp/]};
});
" > $CUSTOM_JS_DIR/custom.js

# Configure kernels and terminal
# The environment of the kernels and the terminal will combine the view and the user script (if any)
echo "Configuring kernels and terminal"
# Python (2 or 3)
if [ -f $LCG_VIEW/bin/python3 ]; then PYVERSION=3; else PYVERSION=2; fi
PYKERNELDIR=$KERNEL_DIR/python$PYVERSION
cp -r /usr/local/share/jupyter/kernelsBACKUP/python2 $PYKERNELDIR
echo "{
 \"display_name\": \"Python $PYVERSION\",
 \"language\": \"python\",
 \"argv\": [
  \"python$PYVERSION\",
  \"-m\",
  \"ipykernel\",
  \"-f\",
  \"{connection_file}\"
 ]
}" > $PYKERNELDIR/kernel.json
# ROOT
cp -rL $LCG_VIEW/etc/notebook/kernels/root $KERNEL_DIR
sed -i "s/python/python$PYVERSION/g" $KERNEL_DIR/root/kernel.json # Set Python version in kernel
# R
cp -rL $LCG_VIEW/share/jupyter/kernels/* $KERNEL_DIR
sed -i "s/IRkernel::main()/options(bitmapType='cairo');IRkernel::main()/g" $KERNEL_DIR/ir/kernel.json # Force cairo for graphics

chown -R $USER:$USER $JPY_DIR $JPY_LOCAL_DIR
export SWAN_ENV_FILE=/tmp/swan.sh
#-----------------------------------------------------Spark Monitor---------------------------------------------
#sudo -E -u $USER sh -c '/usr/local/bin/jupyter serverextension enable sparkmonitor --user --py'
sudo sh -c '/usr/local/bin/jupyter serverextension enable sparkmonitor --py'
sudo sh -c '/usr/local/bin/jupyter serverextension enable sparkmonitor --sys-prefix --py'
sudo -E -u $USER sh -c '/usr/local/bin/jupyter nbextension install sparkmonitor --py --user \
                        && /usr/local/bin/jupyter nbextension enable sparkmonitor --py --user ;\
                           pip2 install --user /extension/ \
                        && ipython profile create \
                        && echo "c.InteractiveShellApp.extensions.append('\''sparkmonitor'\'')" >>  $(ipython profile locate default)/ipython_kernel_config.py ;\
                            echo "INFO--------------------" ;\
                            which pip2 ;\
                            which python2 ;\
                            pip2 show ipykernel ;\
                            which ipython ;\
                           cp -r /notebooks/ $SWAN_HOME'
#---------------------------------------------------------------------------------------------------------------
sudo -E -u $USER sh -c  'source $LCG_VIEW/setup.sh \
                        && if [[ $SPARK_CLUSTER_NAME ]]; \
                           then \
                             echo "Configuring environment for Spark cluster: $SPARK_CLUSTER_NAME"; \
                             source $SPARK_CONFIG_SCRIPT $SPARK_CLUSTER_NAME; \
                             export SPARK_LOCAL_IP=`hostname -i`; \
                             wget -P $SWAN_HOME https://raw.githubusercontent.com/etejedor/Spark-Notebooks/master/SWAN-Spark_NXCALS_Example.ipynb; \
                           fi \
                        && export JUPYTER_DATA_DIR=$LCG_VIEW/share/jupyter \
                        && export TMP_SCRIPT=`mktemp` \
                        && if [[ $USER_ENV_SCRIPT && -f `eval echo $USER_ENV_SCRIPT` ]]; \
                           then \
                             echo "Found user script: $USER_ENV_SCRIPT"; \
                             export TMP_SCRIPT=`mktemp`; \
                             cat `eval echo $USER_ENV_SCRIPT` > $TMP_SCRIPT; \
                             source $TMP_SCRIPT; \
                           else \
                             echo "Cannot find user script: $USER_ENV_SCRIPT"; \
                           fi \
                        && cd $KERNEL_DIR \
                        && python -c "import os; kdirs = os.listdir(\"./\"); \
                           kfile_names = [\"%s/kernel.json\" %kdir for kdir in kdirs]; \
                           kfile_contents = [open(kfile_name).read() for kfile_name in kfile_names]; \
                           exec(\"def addEnv(dtext): d=eval(dtext); d[\\\"env\\\"]=dict(os.environ); return d\"); \
                           kfile_contents_mod = map(addEnv, kfile_contents); \
                           import json; \
                           print kfile_contents_mod; \
                           map(lambda d: open(d[0],\"w\").write(json.dumps(d[1])), zip(kfile_names,kfile_contents_mod)); \
                           termEnvFile = open(\"$SWAN_ENV_FILE\", \"w\"); \
                           [termEnvFile.write(\"export %s=\\\"%s\\\"\\n\" % (key, val)) if key != \"SUDO_COMMAND\" else None for key, val in dict(os.environ).iteritems()];"\
                            echo "INFO--------------------" ;\
                            which pip2 ;\
                            which python2 ;\
                            pip2 show ipykernel ;\
                            which ipython ;\
                            pip2 install -vvv --user --upgrade ipython==5.4.1 ;\
                            pip2 install -vvv --user --upgrade ipykernel==4.6.1 ;\
                            pip2 show ipykernel'

# Spark configuration
if [[ $SPARK_CLUSTER_NAME ]]
then
  LOCAL_IP=`hostname -i`
  echo "$LOCAL_IP $SERVER_HOSTNAME" >> /etc/hosts
fi

# Make sure we have a sane terminal
printf "export TERM=xterm\n" >> $SWAN_ENV_FILE

# If there, source users' .bashrc after the SWAN environment
BASHRC_LOCATION=$SWAN_HOME/.bashrc
printf "if [[ -f $BASHRC_LOCATION ]];
then
   source $BASHRC_LOCATION
fi\n" >> $SWAN_ENV_FILE

if [ $? -ne 0 ]
then
  echo "Error setting the environment for kernels"
  exit 1
fi

# Set the terminal environment
export SWAN_BASH=/bin/swan_bash
printf "#! /bin/env python\nfrom subprocess import call\nimport sys\ncall([\"bash\", \"--rcfile\", \"$SWAN_ENV_FILE\"]+sys.argv[1:])\n" >> $SWAN_BASH
chmod +x $SWAN_BASH

# Run notebook server
echo "Running the notebook server"
sudo -E -u $USER sh -c '   cd $SWAN_HOME \
                        && SHELL=$SWAN_BASH jupyterhub-singleuser \
                           --port=8888 \
                           --ip=0.0.0.0 \
                           --user=$JPY_USER \
                           --cookie-name=$JPY_COOKIE_NAME \
                           --base-url=$JPY_BASE_URL \
                           --hub-prefix=$JPY_HUB_PREFIX \
                           --hub-api-url=$JPY_HUB_API_URL \
                           --NotebookApp.nbserver_extensions="{'\''sparkmonitor'\'':True}"'
