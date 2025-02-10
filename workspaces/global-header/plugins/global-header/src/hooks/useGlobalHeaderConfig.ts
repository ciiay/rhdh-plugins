/*
 * Copyright Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { configApiRef, useApi } from '@backstage/core-plugin-api';

export const useGlobalHeaderConfig = () => {
  const config = useApi(configApiRef);
  const frontendConfig = config.getOptionalConfig('dynamicPlugins.frontend');
  const supportUrl = config.getOptionalString('app.support.url');
  const frontendPackages = frontendConfig?.get();

  const matchesFrontendRoute = (to: string) => {
    // this is for dev env where frontendConfig is undefined
    if (!frontendConfig) {
      return true;
    }

    return Object.values(frontendPackages ?? {}).some(pluginData =>
      (pluginData.dynamicRoutes ?? []).some(
        (route: { path: string }) => route.path === to,
      ),
    );
  };

  const shouldDisplaySupportIcon = (icon?: string, to?: string) => {
    return icon === 'support' && (!!to || !!supportUrl);
  };

  return { supportUrl, matchesFrontendRoute, shouldDisplaySupportIcon };
};
