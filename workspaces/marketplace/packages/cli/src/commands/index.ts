/*
 * Copyright The Backstage Authors
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
import { Command } from 'commander';
import { exitWithError } from '../lib/errors';
import { assertError } from '@backstage/errors';

// Wraps an action function so that it always exits and handles errors
function lazy(
  getActionFunc: () => Promise<(...args: any[]) => Promise<void>>,
): (...args: any[]) => Promise<never> {
  return async (...args: any[]) => {
    try {
      const actionFunc = await getActionFunc();
      await actionFunc(...args);

      process.exit(0);
    } catch (error) {
      assertError(error);
      exitWithError(error);
    }
  };
}

export const registerCommands = (program: Command) => {
  program
    .command('generate')
    .description(
      'Generate a Plugin entities for the marketplace. By default, it will output entities to the standard output',
    )
    .option(
      '-p, --default-dynamic-plugins-config [path]',
      'Path to the default dynamic plugins file (usually dynamic-plugins.default.yaml in rhdh source code)',
    )
    .option(
      '-o, --output-dir [path]',
      'Path to the output directory. Each entity will be written to a separate file',
    )
    .option(
      '--namespace [namespace]',
      'metadata.namespace for the generated Package entities',
    )
    .option('--owner [owner]', 'spec.owner for the generated Package entities')
    .action(lazy(() => import('./generate').then(m => m.default)));
};
