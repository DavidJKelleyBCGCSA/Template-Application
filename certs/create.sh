# Source: https://stackoverflow.com/a/49692380
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
 -keyout server.key -out server.cert -config req.cnf -sha256