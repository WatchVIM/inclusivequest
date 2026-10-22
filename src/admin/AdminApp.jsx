import React from 'react';
import { adminRepository } from '../cms/admin-repository.js';
import ReviewAdminApp from './ReviewAdminApp.jsx';
import AuthenticatedAdminApp from './AuthenticatedAdminApp.jsx';

export default function AdminApp({ repository = adminRepository, deploymentEnvironment = import.meta.env?.VITE_VERCEL_ENV }) {
  return repository.configured ? <AuthenticatedAdminApp repository={repository} deploymentEnvironment={deploymentEnvironment} /> : <ReviewAdminApp />;
}
