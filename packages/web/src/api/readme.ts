import buildDebug from 'debug';
import { Router } from 'express';

import { IAuth } from '@verdaccio/auth';
import { HEADERS, HEADER_TYPE } from '@verdaccio/core';
import { $NextFunctionVer, $RequestExtend, $ResponseExtend, allow } from '@verdaccio/middleware';
import sanitizyReadme from '@verdaccio/readme';
import { Storage } from '@verdaccio/store';
import { Package } from '@verdaccio/types';

import { AuthorAvatar, addScope, parseReadme } from '../utils/web-utils';

export { $RequestExtend, $ResponseExtend, $NextFunctionVer }; // Was required by other packages

export type PackageExt = Package & { author: AuthorAvatar; dist?: { tarball: string } };

const debug = buildDebug('verdaccio:web:api:readme');

export const NOT_README_FOUND = 'ERROR: No README data found!';

function addReadmeWebApi(route: Router, storage: Storage, auth: IAuth): void {
  debug('initialized readme web api');
  const can = allow(auth);

  route.get(
    '/package/readme/(@:scope/)?:package/:version?',
    can('access'),
    function (req: $RequestExtend, res: $ResponseExtend, next: $NextFunctionVer): void {
      debug('readme hit');
      const packageName = req.params.scope
        ? addScope(req.params.scope, req.params.package)
        : req.params.package;
      debug('readme name %o', packageName);

      // @ts-ignore
      storage.getPackage({
        name: packageName,
        uplinksLook: true,
        req,
        callback: function (err, info): void {
          debug('readme plg %o', info?.name);
          if (err) {
            return next(err);
          }

          res.set(HEADER_TYPE.CONTENT_TYPE, HEADERS.TEXT_PLAIN_UTF8);
          try {
            next(parseReadme(info.name, info.readme));
          } catch {
            next(sanitizyReadme(NOT_README_FOUND));
          }
        },
      });
    }
  );
}

export default addReadmeWebApi;
