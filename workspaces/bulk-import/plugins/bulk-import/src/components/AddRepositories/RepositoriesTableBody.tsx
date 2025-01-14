/*
 * Copyright 2024 The Backstage Authors
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
 */ import * as React from 'react';

import { makeStyles, TableBody, TableCell, TableRow } from '@material-ui/core';
import CircularProgress from '@mui/material/CircularProgress';

import { AddedRepositories, AddRepositoryData } from '../../types';
import { OrganizationTableRow } from './OrganizationTableRow';
import { RepositoriesColumnHeader } from './RepositoriesColumnHeader';
import { RepositoryTableRow } from './RepositoryTableRow';

const useStyles = makeStyles(theme => ({
  empty: {
    padding: theme.spacing(2),
    display: 'flex',
    justifyContent: 'center',
  },
}));

export const RepositoriesTableBody = ({
  loading,
  ariaLabel,
  showOrganizations,
  rows,
  emptyRows,
  onOrgRowSelected,
  onClick,
  selectedRepos,
  isDrawer,
}: {
  loading: boolean;
  ariaLabel: string;
  emptyRows: number;
  rows: AddRepositoryData[];
  onOrgRowSelected: (org: AddRepositoryData) => void;
  onClick: (_event: React.MouseEvent, repo: AddRepositoryData) => void;
  selectedRepos: AddedRepositories;
  isDrawer?: boolean;
  showOrganizations?: boolean;
}) => {
  const classes = useStyles();

  const isSelected = (id: string) => {
    return !!selectedRepos[id];
  };

  if (loading) {
    return (
      <tbody>
        <tr>
          <td colSpan={RepositoriesColumnHeader.length}>
            <div data-testid={`${ariaLabel}-loading`} className={classes.empty}>
              <CircularProgress />
            </div>
          </td>
        </tr>
      </tbody>
    );
  } else if (rows?.length > 0) {
    return (
      <TableBody>
        {rows.map(row => {
          const isItemSelected = isSelected(row.id);
          return showOrganizations ? (
            <OrganizationTableRow
              key={row.id}
              onOrgRowSelected={onOrgRowSelected}
              data={row}
            />
          ) : (
            <RepositoryTableRow
              key={row.id}
              handleClick={onClick}
              isItemSelected={isItemSelected}
              data={row}
              isDrawer={isDrawer}
            />
          );
        })}
        {emptyRows > 0 && (
          <TableRow
            style={{
              height: 55 * emptyRows,
            }}
          >
            <TableCell />
          </TableRow>
        )}
      </TableBody>
    );
  }
  return (
    <tbody>
      <tr>
        <td colSpan={RepositoriesColumnHeader.length}>
          <div data-testid="no-repositories-found" className={classes.empty}>
            No records found
          </div>
        </td>
      </tr>
    </tbody>
  );
};
