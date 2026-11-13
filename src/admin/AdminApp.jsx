import React from 'react';
import { adminRepository } from '../cms/admin-repository.js';
import { PUBLIC_CMS_READS_AT_BUILD } from '../cms/backend-config.js';
import ReviewAdminApp from './ReviewAdminApp.jsx';
import AuthenticatedAdminApp from './AuthenticatedAdminApp.jsx';

export default function AdminApp({ repository = adminRepository, deploymentEnvironment = import.meta.env?.VITE_VERCEL_ENV,
  publicationEnabled = PUBLIC_CMS_READS_AT_BUILD }) {
  return repository.configured ? <AuthenticatedAdminApp repository={repository} deploymentEnvironment={deploymentEnvironment}
    publicationEnabled={publicationEnabled === true} /> : <ReviewAdminApp />;
}
