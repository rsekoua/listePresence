"""Initialisation du paquet de configuration.

Permet d'utiliser PyMySQL (pur Python, sans compilation) comme pilote MySQL
sur l'hébergement mutualisé : il se fait passer pour MySQLdb auprès de Django.
Sans effet si la base n'est pas MySQL.
"""

import pymysql

pymysql.install_as_MySQLdb()
