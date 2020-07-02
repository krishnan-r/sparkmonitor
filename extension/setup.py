#!/usr/bin/env python

from setuptools import setup, find_packages

with open('VERSION') as version_file:
    version = version_file.read().strip()




setup(name='sparkmonitor-s',
      version=version,
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
