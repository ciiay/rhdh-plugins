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

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import { SearchBar } from './SearchBar';
import { SearchContextProvider } from '@backstage/plugin-search-react';

export const SearchComponent = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  return (
    <SearchContextProvider>
      <Box
        sx={{
          position: 'relative',
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'start',
          direction: 'ltr',
          mr: 4,
        }}
      >
        <SearchBar
          query={{ term: searchTerm }}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
      </Box>
    </SearchContextProvider>
  );
};
