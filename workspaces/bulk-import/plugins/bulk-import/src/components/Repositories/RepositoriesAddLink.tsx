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
 */ import React from 'react';

import { LinkButton } from '@backstage/core-components';

import { makeStyles } from '@material-ui/core';
import { Alert, AlertTitle } from '@material-ui/lab';
import { useFormikContext } from 'formik';

import { AddRepositoriesFormValues } from '../../types';

const useStyles = makeStyles(() => ({
  addLink: {
    display: 'flex',
    justifyContent: 'end',
    marginBottom: '24px',
  },
}));

export const RepositoriesAddLink = () => {
  const { status, setStatus } = useFormikContext<AddRepositoriesFormValues>();
  const classes = useStyles();

  const handleCloseAlert = () => {
    setStatus(null);
  };
  return (
    <>
      {(status?.title || status?.url) && (
        <>
          <Alert severity="error" onClose={() => handleCloseAlert()}>
            <AlertTitle>
              Error occured while fetching the pull request
            </AlertTitle>
            {`${status?.title} ${status?.url}`}
          </Alert>
          <br />
        </>
      )}
      <span className={classes.addLink}>
        <LinkButton
          to="add"
          color="primary"
          variant="contained"
          data-testid="add-repository"
        >
          Add
        </LinkButton>
      </span>
    </>
  );
};
