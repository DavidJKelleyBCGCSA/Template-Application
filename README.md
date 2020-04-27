### Consultant-ux-api

Node.js server that provide API to support consultant UX user interface.  More to be written here...

#### First-time setup

Install libraries

```bash
npm install
```

To run, you need to have a local copy of Postgres running.  To make this simple, download the repo
and execute the postgres install script

```bash
git clone https://gitlab.com/omnia-platform/kubernetes-local-resources.git
cd postgres
./start
```

To create the schema in the postgres database and populate initial data, run the test scripts:

```bash
npm run test
```

Then start the node server:

```bash
npm start
```

#### Running Locally with Docker Compose

This is a simplified way of running the environment locally without the need for Kubernetes or the `kubernetes-local-resources` project.

Set the following in your `.env` file:
```
CONNECTION_PORT=5432
```

Start the Postgres and Redis services by running:
```bash
docker-compose up -d
```

Run the application as you would normally:
```bash
npm start
```

#### Logging in with BCG Okta

You will need the following variables in your `.env` file to enable logging in with BCG Okta.
Please contact Brian Elting (elting.brian@bcg.com) if you need these values.

```
BCG_IDP_SSO_URL=
BCG_IDP_ISSUER=
BCG_IDP_X509_CERT=
```

#### Migrations

Before running your local API for the first time since the implementation of migrations, it is recommended to start with an empty Postgres schema.
This may require wiping your database.

You will need the following variables in your `.env` file for migrations.
Please contact Brian Elting (elting.brian@bcg.com) if you need these values.

```
SNOWFLAKE_ACCOUNT=
SNOWFLAKE_USERNAME=
SNOWFLAKE_PASSWORD=
``` 

Migrations are run automatically on API startup.
Completed migrations can be seen by viewing the `sequelize_meta` table in Postgres.

To add a new migration, run the following command to create a migration file in the `migrations` directory:

```
npm run new-migration MIGRATION-NAME
```

The `up` method must contain your migration script.
Whenever possible, the `down` method should contain a script to revert your migration.
Please note that all table and column names should use the snake case naming convention.


#### Using FileSource API

The FileSource API provides endpoint support to the File Source widget.  It allows files to be
uploaded and maintains multiple versions of each FileSource widget input.

To upload a few file, you must first create a new FileSource widget with the Widget endpoint.

Given the ```workspaceId``` and ```widgetInstanceId``` associated with the new widget, then
call the endpoint at:

```
/api/fileSource/getUploadToken
```

This endpoint requires the following parameters:

* workspaceId
* widgetInstanceId
* tabNumber - Ordinal of tab if File Source input has multiple tabs (for Excel uploads)
* tabName - Name of tab (for Excel uploads)
* filename - Name of file in local file system
* fileIdHash - Hash of filename, modification date and size.  Used to determine if file has changed
* size - Size of file in bytes
* schema - Schema describing file in form {name, type}

The endpoint will return a hashed token that can be passed when calling the ```upload``` endpoint and uniquely 
identifies version of the file to be uploaded.

Next, call the endpoint:

```bash
/api/fileSource/upload
```

passing the ```token``` along with ```workspaceId``` and ```widgetInstanceId``` as get arguments and streaming the file
contents in the body of the request.

If the upload completes successfully, the widgetInstance will have an object in its ```inputs``` collection that 
specifies the file that has been uploaded, and a table will be created in the data warehouse with the data of the file.

To list all versions of the file currently stored, call:

```
/api/fileSource/listVersions
```

To roll back to a previous version, call:

```bash
/api/fileSource/setVersion
```

To get a preview of the first 100 rows of the current version of the data source call:

```
/api/fileSource/preview
```

## Tableau interface
In order to be able to create workbooks, users, etc in tableau you will need the following variables 
in your `.env` file:

```
TABLEAU_SERVER=
TABLEAU_USERNAME=
TABLEAU_PASSWORD=
TABLEAU_SITE_NAME=
TABLEAU_PROJECT_ROOT=

# also for dev only
TABLEAU_SERVER_TICKET_MIDDLEWARE=
TABLEAU_SERVER_TICKET_SECRET=
```

## JWT 
You will need the following variables in your `.env` file:

JWT_SECRET=
JWT_REFRESH_SECRET=
# Expirations must be specified in seconds
JWT_EXPIRATION=
JWT_REFRESH_EXPIRATION=
JWT_IGNORE_EXPIRATION=