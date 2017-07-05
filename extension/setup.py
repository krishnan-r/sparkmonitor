#!/usr/bin/env python

from setuptools import setup, find_packages

setup(name='sparkmonitor',
      version='0.0.1',
      description='Spark Monitor Extension for Jupyter Notebook',
      author='Krishnan R',
      author_email='krishnanr1997@gmail.com',
      url='https://github.com/krishnan-r/sparkmonitor',
      include_package_data=True,
      packages=find_packages(),
      zip_safe=False,
      install_requires=[
          'bs4'
      ],
      )
