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

import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { globalHeaderPlugin } from '../src/plugin';
import { ExampleComponent } from '../src/components/ExampleComponent';
import { TestApiProvider } from '@backstage/test-utils';
import { MockSearchApi, searchApiRef } from '@backstage/plugin-search-react';

const mockSearchApi = new MockSearchApi({
  results: [
    {
      type: 'software-catalog',
      document: {
        title: 'example search result',
        text: 'this is an example search result',
        location: 'https://example.com',
      },
    },
  ],
});

createDevApp()
  .registerPlugin(globalHeaderPlugin)
  .addPage({
    element: (
      <TestApiProvider apis={[[searchApiRef, mockSearchApi]]}>
        <ExampleComponent />
      </TestApiProvider>
    ),
    title: 'Global Header',
    path: '/global-header',
  })
  .render();
