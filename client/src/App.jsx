import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { useSession } from './context/Session.jsx';
import { PublicLayout, AdminLayout } from './components/Layout.jsx';
import { Loading } from './components/ui.jsx';

import Events from './pages/open/Events.jsx';
import EventDetail from './pages/open/EventDetail.jsx';
import About from './pages/open/About.jsx';
import PublicMembers from './pages/open/PublicMembers.jsx';
import Join from './pages/open/Join.jsx';
import Unlock from './pages/open/Unlock.jsx';
import Login from './pages/open/Login.jsx';

import Fund from './pages/viewer/Fund.jsx';
import Transactions from './pages/viewer/Transactions.jsx';
import Members from './pages/viewer/Members.jsx';
import Collection from './pages/viewer/Collection.jsx';

import Dashboard from './pages/admin/Dashboard.jsx';
import AddTransaction from './pages/admin/AddTransaction.jsx';
import AdminTransactions from './pages/admin/AdminTransactions.jsx';
import Collect from './pages/admin/Collect.jsx';
import AdminMembers from './pages/admin/AdminMembers.jsx';
import MemberDetail from './pages/admin/MemberDetail.jsx';
import MemberForm from './pages/admin/MemberForm.jsx';
import Pending from './pages/admin/Pending.jsx';
import AdminEvents from './pages/admin/AdminEvents.jsx';
import Requests from './pages/admin/Requests.jsx';

import Adjust from './pages/master/Adjust.jsx';
import Pin from './pages/master/Pin.jsx';
import Admins from './pages/master/Admins.jsx';
import Audit from './pages/master/Audit.jsx';
import Settings from './pages/master/Settings.jsx';

function Booting() {
  return (
    <div className="app">
      <main className="main no-nav" style={{ paddingTop: 40 }}>
        <Loading rows={4} />
      </main>
    </div>
  );
}

/** Behind the club PIN. Sends people to the unlock screen and back again. */
function RequireViewer({ children }) {
  const { loading, viewer } = useSession();
  const location = useLocation();
  if (loading) return <Booting />;
  if (!viewer) return <Navigate to="/unlock" state={{ from: location.pathname }} replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { loading, isAdmin } = useSession();
  const location = useLocation();
  if (loading) return <Booting />;
  if (!isAdmin) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

function RequireMaster({ children }) {
  const { loading, isAdmin, isMaster } = useSession();
  if (loading) return <Booting />;
  if (!isAdmin) return <Navigate to="/login" replace />;
  if (!isMaster) return <Navigate to="/admin" replace />;
  return children;
}

const publicPage = (element) => <PublicLayout>{element}</PublicLayout>;
const viewerPage = (element) => (
  <RequireViewer>
    <PublicLayout>{element}</PublicLayout>
  </RequireViewer>
);
const adminPage = (element) => (
  <RequireAdmin>
    <AdminLayout>{element}</AdminLayout>
  </RequireAdmin>
);
const masterPage = (element) => (
  <RequireMaster>
    <AdminLayout>{element}</AdminLayout>
  </RequireMaster>
);

export default function App() {
  return (
    <Routes>
      {/* ---- open: no PIN needed ------------------------------------- */}
      <Route path="/" element={publicPage(<Events />)} />
      <Route path="/events/:slug" element={publicPage(<EventDetail />)} />
      <Route path="/about" element={publicPage(<About />)} />
      <Route path="/members" element={publicPage(<PublicMembers />)} />
      <Route path="/join" element={publicPage(<Join />)} />
      <Route path="/unlock" element={<Unlock />} />
      <Route path="/login" element={<Login />} />

      {/* ---- viewer: behind the club PIN ----------------------------- */}
      <Route path="/fund" element={viewerPage(<Fund />)} />
      <Route path="/fund/transactions" element={viewerPage(<Transactions />)} />
      <Route path="/fund/members" element={viewerPage(<Members />)} />
      <Route path="/fund/collection" element={viewerPage(<Collection />)} />

      {/* ---- admin --------------------------------------------------- */}
      <Route path="/admin" element={adminPage(<Dashboard />)} />
      <Route path="/admin/new" element={adminPage(<AddTransaction />)} />
      <Route path="/admin/transactions" element={adminPage(<AdminTransactions />)} />
      <Route path="/admin/collect" element={adminPage(<Collect />)} />
      <Route path="/admin/members" element={adminPage(<AdminMembers />)} />
      <Route path="/admin/members/new" element={adminPage(<MemberForm />)} />
      <Route path="/admin/members/:id" element={adminPage(<MemberDetail />)} />
      <Route path="/admin/pending" element={adminPage(<Pending />)} />
      <Route path="/admin/events" element={adminPage(<AdminEvents />)} />
      <Route path="/admin/requests" element={adminPage(<Requests />)} />

      {/* ---- master only --------------------------------------------- */}
      <Route path="/admin/adjust" element={masterPage(<Adjust />)} />
      <Route path="/admin/pin" element={masterPage(<Pin />)} />
      <Route path="/admin/admins" element={masterPage(<Admins />)} />
      <Route path="/admin/audit" element={masterPage(<Audit />)} />
      <Route path="/admin/settings" element={masterPage(<Settings />)} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
