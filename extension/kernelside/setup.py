#!/usr/bin/env python

from setuptools import setup, find_packages

setup(name='sparkmonitor',
      version='0.0.1',
      description='Spark Monitor for Jupyter Notebook',
      packages=find_packages(),
      package_data={
          '': ['*.jar'],
      },
      zip_safe=False
      )
