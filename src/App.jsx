// src/App.jsx
import React, { useState, useEffect, useCallback, useMemo} from 'react';
import { getData as getCountryData } from 'country-list';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { X, CheckCircle, Mail, Plane, Send } from 'lucide-react';

/* ============================================================
   Constants, helpers & theme notes
   - Add colors to tailwind.config.js (primary/accent/neutral)
   ============================================================ */

const allCountriesFromPackage = getCountryData().map(c => c.name).sort();
const europeanCountries = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic',
  'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece',
  'Hungary', 'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg',
  'Malta', 'Netherlands', 'Poland', 'Portugal', 'Romania', 'Slovakia',
  'Slovenia', 'Sweden', 'Switzerland', 'United Kingdom'
].sort();

const COUNTRIES = [
  'Spain',
  '--- European Countries ---',
  ...europeanCountries,
  '--- Other Countries ---',
  ...allCountriesFromPackage.filter(c => c !== 'Spain' && !europeanCountries.includes(c))
];

const generateToken = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Helper function to safely convert Firestore timestamps to Date
const safeToDate = (val) => {
  if (!val) return null;
  if (val.toDate) return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val);
};
/* ============================================================
   App - main
   ============================================================ */

export default function App() {
  // Auth & User State
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Domain Data State
  const [speakers, setSpeakers] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [seniorFellows, setSeniorFellows] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [agendas, setAgendas] = useState([]);
  const [userAvailability, setUserAvailability] = useState([]);

  // UI State
  const [showAddDateForm, setShowAddDateForm] = useState(false);
  const [showAddSpeakerForm, setShowAddSpeakerForm] = useState(false);
  const [showAddPastSpeakerForm, setShowAddPastSpeakerForm] = useState(false);
  const [showInviteUserForm, setShowInviteUserForm] = useState(false);
  const [showEditSpeakerForm, setShowEditSpeakerForm] = useState(false);
  const [showEditConfirmedForm, setShowEditConfirmedForm] = useState(false);
  const [showEditUserForm, setShowEditUserForm] = useState(false);
  const [showEditProfileForm, setShowEditProfileForm] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  const [sidebarSpeaker, setSidebarSpeaker] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showAgendaSidebar, setShowAgendaSidebar] = useState(false);
  const [selectedAgenda, setSelectedAgenda] = useState(null);
  const [showAddMeetingForm, setShowAddMeetingForm] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [showPosterSidebar, setShowPosterSidebar] = useState(false);
  const [posterSpeaker, setPosterSpeaker] = useState(null);

  const [speakerAccess, setSpeakerAccess] = useState(null);
  const [signupInvitation, setSignupInvitation] = useState(null);
  const [loadingSignup, setLoadingSignup] = useState(false);

  const [showPasswordResetPanel, setShowPasswordResetPanel] = useState(false);
  const [passwordResetUser, setPasswordResetUser] = useState(null);
  const [showInvitationPanel, setShowInvitationPanel] = useState(false);
  const [invitationData, setInvitationData] = useState(null);
  /* ---------------------------
     Data Loaders (Firestore)
     --------------------------- */
  const loadSpeakers = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'speakers'));
      setSpeakers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('loadSpeakers', err);
    }
  }, []);

  const loadAvailableDates = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, 'available_dates'), orderBy('date', 'asc')));
      setAvailableDates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('loadAvailableDates', err);
    }
  }, []);

  const loadInvitations = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'invitations'));
      setInvitations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('loadInvitations', err);
    }
  }, []);

  const loadSeniorFellows = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, 'user_roles'), where('role', 'in', ['Senior Fellow', 'Fellow', 'Organizer'])));
      setSeniorFellows(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('loadSeniorFellows', err);
    }
  }, []);

  const loadAllUsers = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'user_roles'));
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('loadAllUsers', err);
    }
  }, []);

  const loadAgendas = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, 'agendas'), orderBy('seminar_date', 'desc')));
      setAgendas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('loadAgendas', err);
    }
  }, []);

  const loadUserAvailability = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'user_availability'));
      setUserAvailability(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('loadUserAvailability', err);
    }
  }, []);

  const loadData = useCallback(async () => {
    await Promise.all([
      loadSpeakers(),
      loadAvailableDates(),
      loadInvitations(),
      loadSeniorFellows(),
      loadAllUsers(),
      loadAgendas(),
      loadUserAvailability()
    ]);
  }, [loadSpeakers, loadAvailableDates, loadInvitations, loadSeniorFellows, loadAllUsers, loadAgendas, loadUserAvailability]);


/* ---------------------------
   Lunch reservation alerts (1 week before)
   --------------------------- */
   const upcomingLunchReminders = useMemo(() => {
    if (!userRole) return [];
    
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    oneWeekFromNow.setHours(0, 0, 0, 0);
    
    const oneWeekAndOneDay = new Date(oneWeekFromNow);
    oneWeekAndOneDay.setDate(oneWeekAndOneDay.getDate() + 1);
    
    return speakers.filter(speaker => {
      if (speaker.status !== 'Accepted' || !speaker.assigned_date) return false;
      
      // Check if user is host or organizer
      const isRelevant = userRole.role === 'Organizer' || speaker.host === userRole.full_name;
      if (!isRelevant) return false;
      
      const speakerDate = speaker.assigned_date.toDate ? speaker.assigned_date.toDate() : new Date(speaker.assigned_date);
      speakerDate.setHours(0, 0, 0, 0);
      
      // Check if exactly 7 days from now
      return speakerDate >= oneWeekFromNow && speakerDate < oneWeekAndOneDay;
    });
  }, [speakers, userRole]);

  useEffect(() => {
    if (upcomingLunchReminders.length > 0) {
      upcomingLunchReminders.forEach(speaker => {
        console.log(`⏰ Reminder: ${speaker.full_name}'s seminar is in one week (${formatDate(speaker.assigned_date)}). Don't forget to make lunch reservations!`);
      });
    }
  }, [upcomingLunchReminders]);

  /* ---------------------------
     Token / Signup handling
     --------------------------- */
  const loadSpeakerByToken = useCallback(async (token) => {
    try {
      const ref = collection(db, 'speakers');
      const q = query(ref, where('access_token', '==', token));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const sdoc = snap.docs[0];
        setSpeakerAccess({ id: sdoc.id, ...sdoc.data() });
        await loadAvailableDates();
        await loadSpeakers();
        await loadUserAvailability();
      } else {
        alert('Invalid or expired invitation link');
      }
    } catch (err) {
      console.error('loadSpeakerByToken', err);
    }
  }, [loadAvailableDates, loadSpeakers, loadUserAvailability]);

  const loadUserRole = useCallback(async (uid) => {
    try {
      const ud = await getDoc(doc(db, 'user_roles', uid));
      if (ud.exists()) {
        setUserRole({ id: uid, ...ud.data() });
        await loadData();
      }
    } catch (err) {
      console.error('loadUserRole', err);
    }
  }, [loadData]);

  /* ---------------------------
     URL param effects
     --------------------------- */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) loadSpeakerByToken(token);
  }, [loadSpeakerByToken]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const signupToken = params.get('signup');
    if (signupToken && !user) {
      setLoadingSignup(true);
      (async () => {
        try {
          const ref = collection(db, 'invitations');
          const q = query(ref, where('token', '==', signupToken), where('used', '==', false));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const invDoc = snap.docs[0];
            const invitation = { id: invDoc.id, ...invDoc.data() };
            const expiresAt = invitation.expires_at.toDate();
            if (expiresAt < new Date()) {
              alert('This invitation has expired. Please contact the organizer for a new invitation.');
              setLoadingSignup(false);
              return;
            }
            setSignupInvitation(invitation);
          } else {
            alert('Invalid or already used invitation link.');
          }
        } catch (err) {
          console.error('signup token load', err);
          alert('Error loading invitation. Please try again.');
        } finally {
          setLoadingSignup(false);
        }
      })();
    }
  }, [user]);

  /* ---------------------------
     Auth listener
     --------------------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await loadUserRole(currentUser.uid);
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [loadUserRole]);

  /* ---------------------------
     Auth handlers
     --------------------------- */
  const handleLogin = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      alert('Login failed: ' + (err.message || err));
    }
  };

  const handleSignup = async (password) => {
    if (!signupInvitation) return;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, signupInvitation.email, password);
      await setDoc(doc(db, 'user_roles', userCredential.user.uid), {
        email: signupInvitation.email,
        full_name: signupInvitation.full_name,
        affiliation: signupInvitation.affiliation,
        role: signupInvitation.role,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'invitations', signupInvitation.id), {
        used: true,
        used_at: serverTimestamp()
      });
      setSignupInvitation(null);
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        alert('An account with this email already exists. Please login instead.');
      } else {
        alert('Signup failed: ' + (err.message || err));
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  /* ---------------------------
     Speaker / Date / Invitation handlers
     --------------------------- */
  const handleAddDate = async (formData) => {
    try {
      const newDate = new Date(formData.date);
      const newDateString = newDate.toISOString().split('T')[0];
      const duplicate = availableDates.find(d => {
        if (d.locked_by_id === 'DELETED') return false;
        const existing = d.date?.toDate ? d.date.toDate() : new Date(d.date);
        return existing.toISOString().split('T')[0] === newDateString;
      });
      if (duplicate) {
        alert(`This date (${formatDate(duplicate.date)}) already exists.`);
        return;
      }
      await addDoc(collection(db, 'available_dates'), {
        ...formData,
        date: Timestamp.fromDate(newDate),
        available: true,
        locked_by_id: null,
        createdAt: serverTimestamp()
      });
      await loadAvailableDates();
      setShowAddDateForm(false);
    } catch (err) {
      alert('Error adding date: ' + (err.message || err));
    }
  };

  const handleDeleteDate = async (dateId) => {
    const date = availableDates.find(d => d.id === dateId);
    if (date && !date.available) {
      alert('Cannot delete a date that is locked by a speaker.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this date?')) return;
    try {
      await updateDoc(doc(db, 'available_dates', dateId), {
        available: false,
        locked_by_id: 'DELETED'
      });
      await loadAvailableDates();
    } catch (err) {
      alert('Error deleting date: ' + (err.message || err));
    }
  };

  const handleAddSpeaker = async (formData) => {
    try {
      const token = generateToken();
      await addDoc(collection(db, 'speakers'), {
        ...formData,
        status: 'Proposed',
        proposed_by_id: user.uid,
        proposed_by_name: userRole.full_name,
        access_token: token,
        actions: [],
        votes: [],
        createdAt: serverTimestamp()
      });
      await loadSpeakers();
      setShowAddSpeakerForm(false);
    } catch (err) {
      alert('Error adding speaker: ' + (err.message || err));
    }
  };

  const handleAddPastSpeaker = async (formData) => {
    try {
      await addDoc(collection(db, 'speakers'), {
        ...formData,
        status: 'Accepted',
        proposed_by_id: user.uid,
        proposed_by_name: userRole.full_name,
        assigned_date: Timestamp.fromDate(new Date(formData.assigned_date)),
        actions: [],
        votes: [],
        createdAt: serverTimestamp()
      });
      await loadSpeakers();
      setShowAddPastSpeakerForm(false);
      alert('Past speaker added successfully!');
    } catch (err) {
      alert('Error adding past speaker: ' + (err.message || err));
    }
  };

  const handleDeleteSpeaker = async (speakerId) => {
    if (!window.confirm('Are you sure you want to delete this speaker proposal?')) return;
    try {
      await deleteDoc(doc(db, 'speakers', speakerId));
      await loadSpeakers();
      alert('Speaker deleted successfully!');
    } catch (err) {
      alert('Error deleting speaker: ' + (err.message || err));
    }
  };

  const handleAcceptSpeaker = async (speakerId) => {
    try {
      const sp = speakers.find(s => s.id === speakerId);
      const token = sp.access_token || generateToken();
      const actions = sp.actions || [];
      actions.push({
        type: 'invitation_drafted',
        timestamp: new Date().toISOString(),
        completed: false,
        user: userRole.full_name
      });
      await updateDoc(doc(db, 'speakers', speakerId), {
        status: 'Invited',
        access_token: token,
        invitation_sent_date: serverTimestamp(),
        response_deadline: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        actions
      });
      await loadSpeakers();
      const updated = { ...sp, status: 'Invited', access_token: token, actions };
      setSidebarSpeaker(updated);
      setShowSidebar(true);
    } catch (err) {
      alert('Error accepting speaker: ' + (err.message || err));
    }
  };

  const handleResendInvitation = async (speaker) => {
    try {
      await updateDoc(doc(db, 'speakers', speaker.id), {
        invitation_sent_date: serverTimestamp(),
        response_deadline: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
      });
      await loadSpeakers();
      const updated = { ...speaker, invitation_sent_date: Timestamp.now(), response_deadline: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) };
      setSidebarSpeaker(updated);
      setShowSidebar(true);
    } catch (err) {
      alert('Error resending invitation: ' + (err.message || err));
    }
  };

  const handleRejectSpeaker = async (speakerId) => {
    if (!window.confirm('Are you sure you want to reject this speaker?')) return;
    try {
      await updateDoc(doc(db, 'speakers', speakerId), { status: 'Declined' });
      await loadSpeakers();
    } catch (err) {
      alert('Error rejecting speaker: ' + (err.message || err));
    }
  };

  const handleVoteSpeaker = async (speakerId, action) => {
    try {
      if (!user) { alert('You must be logged in to vote'); return; }
      const sp = speakers.find(s => s.id === speakerId);
      let votes = sp.votes || [];
      const existing = votes.findIndex(v => v.user_id === user.uid);
      if (action === 'upvote') {
        if (existing >= 0) {
          votes.splice(existing, 1);
        } else {
          votes.push({ user_id: user.uid, user_name: userRole.full_name, timestamp: new Date().toISOString() });
        }
      }
      await updateDoc(doc(db, 'speakers', speakerId), { votes });
      await loadSpeakers();
    } catch (err) {
      alert('Error voting on speaker: ' + (err.message || err));
    }
  };

  const handleUpdateAction = async (speakerId, actionIndex, completed) => {
    try {
      const sp = speakers.find(s => s.id === speakerId);
      const actions = [...(sp.actions || [])];
      actions[actionIndex].completed = completed;
      actions[actionIndex].completedAt = completed ? new Date().toISOString() : null;
      await updateDoc(doc(db, 'speakers', speakerId), { actions });
      await loadSpeakers();
      if (sidebarSpeaker && sidebarSpeaker.id === speakerId) {
        setSidebarSpeaker({ ...sidebarSpeaker, actions });
      }
    } catch (err) {
      alert('Error updating action: ' + (err.message || err));
    }
  };

  const handleAddManualAction = async (speakerId, actionType) => {
    try {
      const sp = speakers.find(s => s.id === speakerId);
      const actions = [...(sp.actions || [])];
      actions.push({
        type: actionType,
        timestamp: new Date().toISOString(),
        completed: false,
        user: userRole.full_name
      });
      await updateDoc(doc(db, 'speakers', speakerId), { actions });
      await loadSpeakers();
      if (sidebarSpeaker && sidebarSpeaker.id === speakerId) {
        setSidebarSpeaker({ ...sidebarSpeaker, actions });
      }
    } catch (err) {
      alert('Error adding action: ' + (err.message || err));
    }
  };

  const handleEditSpeaker = async (formData) => {
    try {
      if (!editingSpeaker) return;
      await updateDoc(doc(db, 'speakers', editingSpeaker.id), formData);
      await loadSpeakers();
      setShowEditSpeakerForm(false);
      setEditingSpeaker(null);
    } catch (err) {
      alert('Error updating speaker: ' + (err.message || err));
    }
  };

  const handleEditConfirmedSpeaker = async (formData) => {
    try {
      if (!editingSpeaker) return;
      const updateData = {
        ...formData,
        assigned_date: formData.assigned_date ? Timestamp.fromDate(new Date(formData.assigned_date)) : null
      };
      await updateDoc(doc(db, 'speakers', editingSpeaker.id), updateData);

      if (formData.old_date_id && formData.new_date_id && formData.old_date_id !== formData.new_date_id) {
        await updateDoc(doc(db, 'available_dates', formData.old_date_id), { available: true, locked_by_id: null, talk_title: '' });
        await updateDoc(doc(db, 'available_dates', formData.new_date_id), { available: false, locked_by_id: editingSpeaker.id, talk_title: formData.talk_title });
      } else if (formData.current_date_id) {
        await updateDoc(doc(db, 'available_dates', formData.current_date_id), { talk_title: formData.talk_title });
      }

      await loadSpeakers();
      await loadAvailableDates();
      setShowEditConfirmedForm(false);
      setEditingSpeaker(null);
    } catch (err) {
      alert('Error updating confirmed speaker: ' + (err.message || err));
    }
  };

  const handleDeleteConfirmedSpeaker = async (speakerId) => {
    if (!window.confirm('Are you sure you want to delete this confirmed speaker? This will also delete their agenda and free up their assigned date.')) return;
    try {
      const speakerAgenda = agendas.find(a => a.speaker_id === speakerId);
      if (speakerAgenda) {
        await deleteDoc(doc(db, 'agendas', speakerAgenda.id));
      }
      const lockedDate = availableDates.find(d => d.locked_by_id === speakerId);
      if (lockedDate) {
        await updateDoc(doc(db, 'available_dates', lockedDate.id), { available: true, locked_by_id: null, talk_title: '' });
      }
      await deleteDoc(doc(db, 'speakers', speakerId));
      await loadSpeakers();
      await loadAvailableDates();
      await loadAgendas();
      setShowEditConfirmedForm(false);
      setEditingSpeaker(null);
      alert('Speaker deleted successfully!');
    } catch (err) {
      alert('Error deleting speaker: ' + (err.message || err));
    }
  };

  const handleDeleteInvitedSpeaker = async (speakerId) => {
    if (!window.confirm('Are you sure you want to delete this invited speaker? This will cancel their invitation.')) return;
    try {
      await deleteDoc(doc(db, 'speakers', speakerId));
      await loadSpeakers();
      alert('Invited speaker deleted successfully!');
    } catch (err) {
      alert('Error deleting speaker: ' + (err.message || err));
    }
  };

  /* ---------------------------
     Speaker accept/decline (speaker access flow)
     --------------------------- */
  const handleSpeakerAccept = async (dateId, talkTitle, talkAbstract) => {
    try {
      await updateDoc(doc(db, 'available_dates', dateId), {
        available: false,
        locked_by_id: speakerAccess.id,
        talk_title: talkTitle || '(TBC)'
      });
      const selectedDate = availableDates.find(d => d.id === dateId);
      const actions = speakerAccess.actions || [];
      actions.push({
        type: 'speaker_responded',
        timestamp: new Date().toISOString(),
        completed: true,
        user: speakerAccess.full_name,
        action: 'accepted'
      });
      actions.push({
        type: 'travel_arrangements',
        timestamp: new Date().toISOString(),
        completed: false,
        user: speakerAccess.full_name
      });
      await updateDoc(doc(db, 'speakers', speakerAccess.id), {
        status: 'Accepted',
        assigned_date: selectedDate.date,
        talk_title: talkTitle || '(TBC)',
        talk_abstract: talkAbstract || '',
        actions
      });
      const visitDate = safeToDate(selectedDate.date);
      const dayBefore = new Date(visitDate); dayBefore.setDate(dayBefore.getDate() - 1);
      const dayAfter = new Date(visitDate); dayAfter.setDate(dayAfter.getDate() + 1);
      const seminarStart = new Date(visitDate); seminarStart.setHours(10, 0, 0, 0);
      const seminarEnd = new Date(visitDate); seminarEnd.setHours(11, 0, 0, 0);
      const seminarEvent = {
        title: talkTitle || '(TBC)',
        type: 'seminar',
        date: Timestamp.fromDate(visitDate),
        start_time: Timestamp.fromDate(seminarStart),
        end_time: Timestamp.fromDate(seminarEnd),
        location: selectedDate.notes || 'TBD',
        notes: 'Main seminar presentation',
        attendees: [],
        is_locked: true
      };
      const lunchStart = new Date(visitDate); lunchStart.setHours(13, 0, 0, 0);
      const lunchEnd = new Date(visitDate); lunchEnd.setHours(14, 0, 0, 0);
      const lunchEvent = {
        title: 'Lunch',
        type: 'social',
        date: Timestamp.fromDate(visitDate),
        start_time: Timestamp.fromDate(lunchStart),
        end_time: Timestamp.fromDate(lunchEnd),
        location: '',
        notes: 'Lunch break',
        attendees: [],
        is_locked: false
      };
      await addDoc(collection(db, 'agendas'), {
        speaker_id: speakerAccess.id,
        speaker_name: speakerAccess.full_name,
        speaker_email: speakerAccess.email,
        host: selectedDate.host,
        seminar_date: selectedDate.date,
        start_date: Timestamp.fromDate(dayBefore),
        end_date: Timestamp.fromDate(dayAfter),
        meetings: [seminarEvent, lunchEvent],
        createdAt: serverTimestamp()
      });
      alert('Thank you! Your presentation has been scheduled.');
      await loadAvailableDates();
      await loadAgendas();
      setSpeakerAccess({ ...speakerAccess, status: 'Accepted', actions });
    } catch (err) {
      console.error('handleSpeakerAccept', err);
      alert('Error accepting invitation: ' + (err.message || err));
    }
  };

  const handleSpeakerDecline = async () => {
    if (!window.confirm('Are you sure you want to decline this invitation?')) return;
    try {
      const actions = speakerAccess.actions || [];
      actions.push({
        type: 'speaker_responded',
        timestamp: new Date().toISOString(),
        completed: true,
        user: speakerAccess.full_name,
        action: 'declined'
      });
      await updateDoc(doc(db, 'speakers', speakerAccess.id), {
        status: 'Declined',
        actions
      });
      alert('Your response has been recorded. Thank you for your time.');
      setSpeakerAccess({ ...speakerAccess, status: 'Declined', actions });
    } catch (err) {
      console.error('handleSpeakerDecline', err);
      alert('Error declining invitation: ' + (err.message || err));
    }
  };

  /* ---------------------------
     Invitation creation
     --------------------------- */
     const handleCreateInvitation = async (formData) => {
      try {
        const token = generateToken();
        const signupLink = `${window.location.origin}?signup=${token}`;
        await addDoc(collection(db, 'invitations'), {
          ...formData,
          token,
          invited_by_id: user.uid,
          invited_by_name: userRole.full_name,
          used: false,
          expires_at: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
          createdAt: serverTimestamp()
        });
        
        const emailSubject = `Invitation to Join Collaboratorium Barcelona as ${formData.role}`;
        const emailBody = `Dear ${formData.full_name},
    
    You have been invited to join the Collaboratorium for Theoretical Modelling and Predictive Biology in Barcelona as a ${formData.role}.
    
    Your affiliation: ${formData.affiliation}
    
    Please use the following link to complete your registration:
    ${signupLink}
    
    This invitation will remain valid for 30 days.
    
    Best regards,
    ${userRole.full_name}`;
    
        setInvitationData({
          email: formData.email,
          subject: emailSubject,
          body: emailBody,
          link: signupLink
        });
        setShowInvitationPanel(true);
        
        await loadInvitations();
        setShowInviteUserForm(false);
      } catch (err) {
        alert('Error creating invitation: ' + (err.message || err));
      }
    };

  /* ---------------------------
     Users (edit/delete/reset)
     --------------------------- */
  const handleEditUser = async (formData) => {
    try {
      if (!editingUser) return;
      await updateDoc(doc(db, 'user_roles', editingUser.id), {
        full_name: formData.full_name,
        affiliation: formData.affiliation,
        role: formData.role
      });
      await loadAllUsers();
      await loadSeniorFellows();
      setShowEditUserForm(false);
      setEditingUser(null);
      alert('User updated successfully!');
    } catch (err) {
      alert('Error updating user: ' + (err.message || err));
    }
  };

  const handleEditOwnProfile = async (formData) => {
    try {
      await updateDoc(doc(db, 'user_roles', user.uid), {
        full_name: formData.full_name,
        affiliation: formData.affiliation
      });
      setUserRole({
        ...userRole,
        full_name: formData.full_name,
        affiliation: formData.affiliation
      });
      await loadAllUsers();
      await loadSeniorFellows();
      setShowEditProfileForm(false);
      alert('Profile updated successfully!');
    } catch (err) {
      alert('Error updating profile: ' + (err.message || err));
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (userId === user.uid) {
      alert('You cannot delete your own account!');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove ${userEmail} from the system?`)) return;
    try {
      await deleteDoc(doc(db, 'user_roles', userId));
      await loadAllUsers();
      await loadSeniorFellows();
      alert('User removed successfully!');
    } catch (err) {
      alert('Error removing user: ' + (err.message || err));
    }
  };

  const handlePasswordReset = async (email, userName) => {
    setPasswordResetUser({ email, userName });
    setShowPasswordResetPanel(true);
  };

  /* ---------------------------
     User availability
     --------------------------- */
  const handleUpdateAvailability = async (dateId, available) => {
    try {
      const existing = userAvailability.find(ua => ua.user_id === user.uid && ua.date_id === dateId);
      if (existing) {
        await updateDoc(doc(db, 'user_availability', existing.id), { available, updatedAt: serverTimestamp() });
      } else {
        if (!available) {
          await addDoc(collection(db, 'user_availability'), {
            user_id: user.uid,
            user_name: userRole.full_name,
            date_id: dateId,
            available: false,
            createdAt: serverTimestamp()
          });
        }
      }
      await loadUserAvailability();
    } catch (err) {
      alert('Error updating availability: ' + (err.message || err));
    }
  };

  /* ---------------------------
     Agenda / Meetings
     --------------------------- */
  const handleViewAgenda = (speaker) => {
    const agenda = agendas.find(a => a.speaker_id === speaker.id);
    if (agenda) {
      setSelectedAgenda(agenda);
      setShowAgendaSidebar(true);
    } else {
      alert('Agenda not found for this speaker.');
    }
  };

  const handleGeneratePoster = (speaker) => {
    setPosterSpeaker(speaker);
    setShowPosterSidebar(true);
  };

  const handleAddMeeting = async (meetingData) => {
    try {
      const agenda = selectedAgenda;
      const meetings = [...(agenda.meetings || [])];
      const meetingDate = new Date(meetingData.date);
      const start = new Date(meetingDate);
      const [sh, sm] = meetingData.start_time.split(':');
      start.setHours(parseInt(sh, 10), parseInt(sm, 10), 0, 0);
      const end = new Date(meetingDate);
      const [eh, em] = meetingData.end_time.split(':');
      end.setHours(parseInt(eh, 10), parseInt(em, 10), 0, 0);
      const newMeeting = {
        title: meetingData.title,
        type: meetingData.type,
        date: Timestamp.fromDate(meetingDate),
        start_time: Timestamp.fromDate(start),
        end_time: Timestamp.fromDate(end),
        location: meetingData.location || '',
        attendees: meetingData.attendees ? meetingData.attendees.split(',').map(a => a.trim()) : [],
        notes: meetingData.notes || '',
        is_locked: false
      };
      meetings.push(newMeeting);
      const updatedAgenda = { ...agenda, meetings };
      setSelectedAgenda(updatedAgenda);
      setShowAddMeetingForm(false);
      setSelectedTimeSlot(null);
      await updateDoc(doc(db, 'agendas', agenda.id), { meetings });
      await loadAgendas();
    } catch (err) {
      alert('Error adding meeting: ' + (err.message || err));
      await loadAgendas();
      const original = agendas.find(a => a.id === selectedAgenda?.id);
      if (original) setSelectedAgenda(original);
    }
  };

  const handleDeleteMeeting = async (meetingIndex) => {
    if (!window.confirm('Are you sure you want to delete this meeting?')) return;
    try {
      const agenda = selectedAgenda;
      const meetings = [...(agenda.meetings || [])];
      if (meetings[meetingIndex].is_locked) {
        alert('Cannot delete the main seminar presentation.');
        return;
      }
      meetings.splice(meetingIndex, 1);
      const updatedAgenda = { ...agenda, meetings };
      setSelectedAgenda(updatedAgenda);
      await updateDoc(doc(db, 'agendas', agenda.id), { meetings });
      await loadAgendas();
    } catch (err) {
      alert('Error deleting meeting: ' + (err.message || err));
      await loadAgendas();
      const original = agendas.find(a => a.id === selectedAgenda?.id);
      if (original) setSelectedAgenda(original);
    }
  };

  /* ---------------------------
     Small UX helpers
     --------------------------- */
  const getRankingColor = (ranking) => {
    switch (ranking) {
      case 'High Priority': return 'bg-red-400';
      case 'Medium Priority': return 'bg-yellow-400';
      case 'Low Priority': return 'bg-green-400';
      default: return 'bg-gray-300';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Proposed': return 'text-gray-500';
      case 'Invited': return 'text-sky-600';
      case 'Accepted': return 'text-emerald-600';
      case 'Declined': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  /* ---------------------------
     Loading states & route fallbacks
     --------------------------- */
  if ((loading || loadingSignup) && !signupInvitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center text-neutral-600">Loading...</div>
      </div>
    );
  }

  if (signupInvitation && !user) {
    return <SignupView invitation={signupInvitation} onSignup={handleSignup} />;
  }

  if (speakerAccess) {
    return (
      <SpeakerAccessView
        speaker={speakerAccess}
        availableDates={availableDates}
        userAvailability={userAvailability}
        pastSpeakers={speakers.filter(s => s.status === 'Accepted')}
        onAccept={handleSpeakerAccept}
        onDecline={handleSpeakerDecline}
        formatDate={formatDate}
      />
    );
  }

  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }

  if (user && !userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-neutral-600">Loading user data...</div>
      </div>
    );
  }

  /* ============================================================
     Main layout
     ============================================================ */
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-800">
      {/* Header */}
      <header className="bg-primary-dark text-white px-6 py-4 flex items-center justify-between shadow">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Seminar Management System</h1>
          <span className="text-sm text-neutral-200">Collaboratorium Barcelona</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm">
            {userRole?.full_name} <span className="text-neutral-300">({userRole?.role})</span>
          </div>
          <button onClick={handleLogout} className="px-3 py-1 border border-neutral-200 rounded hover:bg-neutral-100 text-sm">Logout</button>
        </div>
      </header>

      {/* Main container with max-width */}
      <div className="flex max-w-[1600px] mx-auto">
        {/* Left nav - REDUCED */}
        <nav className="w-56 bg-white border-r p-4 space-y-2">
          <NavButton label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavButton label="Past Speakers" active={activeTab === 'statistics'} onClick={() => setActiveTab('statistics')} />
          {(userRole?.role === 'Fellow' || userRole?.role === 'Senior Fellow' || userRole?.role === 'Organizer') && (
            <NavButton label="My Availability" active={activeTab === 'availability'} onClick={() => setActiveTab('availability')} />
          )}
          {userRole?.role === 'Organizer' && (
            <>
              <NavButton label="Available Dates" active={activeTab === 'dates'} onClick={() => setActiveTab('dates')} />
              <NavButton label="Propose Speaker" active={activeTab === 'propose'} onClick={() => setActiveTab('propose')} />
              <NavButton label="Manage Users" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
              <NavButton label="User Invitations" active={activeTab === 'invitations'} onClick={() => setActiveTab('invitations')} />
            </>
          )}
          {userRole?.role === 'Senior Fellow' && (
            <NavButton label="Propose Speaker" active={activeTab === 'propose'} onClick={() => setActiveTab('propose')} />
          )}
          <NavButton label="My Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
        </nav>

        {/* Main content - with flex-1 but constrained by parent max-width */}
        <main className="flex-1 p-6 space-y-6 overflow-x-hidden">
          {activeTab === 'dashboard' && (
            <DashboardView
              userRole={userRole}
              speakers={speakers}
              availableDates={availableDates}
              upcomingLunchReminders={upcomingLunchReminders}
              onAcceptSpeaker={handleAcceptSpeaker}
              onRejectSpeaker={handleRejectSpeaker}
              onResendInvitation={handleResendInvitation}
              onEditSpeaker={(s) => { setEditingSpeaker(s); setShowEditSpeakerForm(true); }}
              onEditConfirmed={(s) => { setEditingSpeaker(s); setShowEditConfirmedForm(true); }}
              onViewActions={(s) => { setSidebarSpeaker(s); setShowSidebar(true); }}
              onViewAgenda={handleViewAgenda}
              onGeneratePoster={handleGeneratePoster}
              onDeleteInvited={handleDeleteInvitedSpeaker}
              onVoteSpeaker={handleVoteSpeaker}
              currentUser={userRole}
              getRankingColor={getRankingColor}
              getStatusColor={getStatusColor}
              formatDate={formatDate}
            />
          )}

          {activeTab === 'availability' && (userRole?.role === 'Fellow' || userRole?.role === 'Organizer') && (
            <AvailabilityView
              dates={availableDates.filter(d => d.locked_by_id !== 'DELETED')}
              userAvailability={userAvailability}
              currentUser={userRole}
              onUpdateAvailability={handleUpdateAvailability}
              formatDate={formatDate}
            />
          )}

          {activeTab === 'statistics' && (
            <StatisticsView
              speakers={speakers}
              formatDate={formatDate}
              onAddPastSpeaker={() => setShowAddPastSpeakerForm(true)}
              isOrganizer={userRole?.role === 'Organizer'}
            />
          )}

          {activeTab === 'dates' && userRole?.role === 'Organizer' && (
            <DatesView
              dates={availableDates.filter(d => d.locked_by_id !== 'DELETED')}
              speakers={speakers}
              onAddDate={() => setShowAddDateForm(true)}
              onDeleteDate={handleDeleteDate}
              formatDate={formatDate}
            />
          )}

          {activeTab === 'users' && userRole?.role === 'Organizer' && (
            <ManageUsersView
              users={allUsers}
              currentUserId={user.uid}
              onEditUser={(u) => { setEditingUser(u); setShowEditUserForm(true); }}
              onDeleteUser={handleDeleteUser}
              onPasswordReset={handlePasswordReset}
              formatDate={formatDate}
            />
          )}

          {activeTab === 'invitations' && userRole?.role === 'Organizer' && (
            <InvitationsView
              invitations={invitations}
              onCreateInvitation={() => setShowInviteUserForm(true)}
              formatDate={formatDate}
            />
          )}

          {activeTab === 'propose' && (
            <ProposeSpeakerView
              onAddSpeaker={() => setShowAddSpeakerForm(true)}
              speakers={speakers.filter(s => s.proposed_by_id === user.uid && s.status !== 'Accepted')}
              onEditSpeaker={(s) => { setEditingSpeaker(s); setShowEditSpeakerForm(true); }}
              onDeleteSpeaker={handleDeleteSpeaker}
              getRankingColor={getRankingColor}
              getStatusColor={getStatusColor}
              formatDate={formatDate}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView userRole={userRole} onEditProfile={() => setShowEditProfileForm(true)} />
          )}
        </main>

        {/* Right panel - with full height */}
        <aside className="w-80 border-l bg-white p-4 min-h-screen">
          {showSidebar && sidebarSpeaker && (
            <ActionsSidebar
              speaker={sidebarSpeaker}
              onClose={() => { setShowSidebar(false); setSidebarSpeaker(null); }}
              onUpdateAction={handleUpdateAction}
              onAddAction={handleAddManualAction}
              currentUser={userRole}
              formatDate={formatDate}
            />
          )}

          {showPosterSidebar && posterSpeaker && (
            <PosterSidebar
              speaker={posterSpeaker}
              onClose={() => { setShowPosterSidebar(false); setPosterSpeaker(null); }}
              formatDate={formatDate}
              allUsers={allUsers}
            />
          )}
        </aside>
      </div>

      {/* Modals & Forms */}
      {showAddDateForm && <AddDateForm onSubmit={handleAddDate} onCancel={() => setShowAddDateForm(false)} existingDates={availableDates} formatDate={formatDate} />}

      {showAddSpeakerForm && <AddSpeakerForm onSubmit={handleAddSpeaker} onCancel={() => setShowAddSpeakerForm(false)} seniorFellows={seniorFellows} currentUser={userRole} countries={COUNTRIES} />}

      {showAddPastSpeakerForm && <AddPastSpeakerForm onSubmit={handleAddPastSpeaker} onCancel={() => setShowAddPastSpeakerForm(false)} seniorFellows={seniorFellows} countries={COUNTRIES} />}

      {showEditSpeakerForm && editingSpeaker && <EditSpeakerForm speaker={editingSpeaker} onSubmit={handleEditSpeaker} onCancel={() => { setShowEditSpeakerForm(false); setEditingSpeaker(null); }} seniorFellows={seniorFellows} countries={COUNTRIES} />}

      {showEditConfirmedForm && editingSpeaker && <EditConfirmedSpeakerForm speaker={editingSpeaker} availableDates={availableDates} onSubmit={handleEditConfirmedSpeaker} onDelete={handleDeleteConfirmedSpeaker} onCancel={() => { setShowEditConfirmedForm(false); setEditingSpeaker(null); }} formatDate={formatDate} />}

      {showInviteUserForm && <InviteUserForm onSubmit={handleCreateInvitation} onCancel={() => setShowInviteUserForm(false)} />}

      {showEditUserForm && editingUser && <EditUserForm user={editingUser} onSubmit={handleEditUser} onCancel={() => { setShowEditUserForm(false); setEditingUser(null); }} />}

      {showEditProfileForm && <EditProfileForm userRole={userRole} onSubmit={handleEditOwnProfile} onCancel={() => setShowEditProfileForm(false)} />}
      
      {/* Agenda Modal - ADD THIS */}
      {showAgendaSidebar && selectedAgenda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <AgendaSidebar
              agenda={selectedAgenda}
              onClose={() => { setShowAgendaSidebar(false); setSelectedAgenda(null); setShowAddMeetingForm(false); setSelectedTimeSlot(null); }}
              onAddMeeting={() => setShowAddMeetingForm(true)}
              onDeleteMeeting={handleDeleteMeeting}
              showAddMeetingForm={showAddMeetingForm}
              onSubmitMeeting={handleAddMeeting}
              onCancelMeeting={() => { setShowAddMeetingForm(false); setSelectedTimeSlot(null); }}
              selectedTimeSlot={selectedTimeSlot}
              onSelectTimeSlot={setSelectedTimeSlot}
              formatDate={formatDate}
              currentUser={userRole}
            />
          </div>
        </div>
      )}
      {/* Password Reset Panel */}
      {showPasswordResetPanel && passwordResetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-primary text-white">
              <h3 className="text-xl font-semibold">Password Reset Instructions</h3>
              <button 
                onClick={() => {
                  setShowPasswordResetPanel(false);
                  setPasswordResetUser(null);
                }}
                className="text-white hover:text-neutral-200"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-neutral-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-neutral-600 mb-2">
                  <strong>To:</strong> {passwordResetUser.email}
                </p>
                <p className="text-sm text-neutral-600 mb-4">
                  <strong>Subject:</strong> Password Reset - Barcelona Collaboratorium
                </p>
                <div className="bg-white border rounded p-4 text-sm leading-relaxed">
                  <p className="mb-3">Dear {passwordResetUser.userName},</p>
                  <p className="mb-3">
                    You have requested a password reset for your Barcelona Collaboratorium account.
                  </p>
                  <p className="mb-3">
                    Please contact the system administrator at [admin email] to reset your password, 
                    or visit the login page and use the "Forgot Password" link.
                  </p>
                  <p className="mb-3">
                    If you did not request this reset, please ignore this message.
                  </p>
                  <p>
                    Best regards,<br />
                    Barcelona Collaboratorium Team
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    const text = `Dear ${passwordResetUser.userName},

You have requested a password reset for your Barcelona Collaboratorium account.

Please contact the system administrator to reset your password, or visit the login page and use the "Forgot Password" link.

If you did not request this reset, please ignore this message.

Best regards,
Barcelona Collaboratorium Team`;
                    
                    try {
                      await navigator.clipboard.writeText(text);
                      alert('Message copied to clipboard!');
                    } catch (err) {
                      console.error('Copy failed:', err);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded hover:bg-primary/80"
                >
                  📋 Copy Message
                </button>
                <button
                  onClick={() => {
                    const subject = 'Password Reset - Barcelona Collaboratorium';
                    const body = `Dear ${passwordResetUser.userName},

You have requested a password reset for your Barcelona Collaboratorium account.

Please contact the system administrator to reset your password, or visit the login page and use the "Forgot Password" link.

If you did not request this reset, please ignore this message.

Best regards,
Barcelona Collaboratorium Team`;
                    window.location.href = `mailto:${passwordResetUser.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  📧 Open Email Client
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invitation Panel */}
      {showInvitationPanel && invitationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-primary text-white">
              <h3 className="text-xl font-semibold">User Invitation</h3>
              <button 
                onClick={() => {
                  setShowInvitationPanel(false);
                  setInvitationData(null);
                }}
                className="text-white hover:text-neutral-200"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-neutral-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-neutral-600 mb-2">
                  <strong>To:</strong> {invitationData.email}
                </p>
                <p className="text-sm text-neutral-600 mb-4">
                  <strong>Subject:</strong> {invitationData.subject}
                </p>
                <div className="bg-white border rounded p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {invitationData.body}
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                <p className="text-xs text-blue-900 mb-2 font-semibold">Signup Link:</p>
                <code className="text-xs bg-white px-2 py-1 rounded block break-all">{invitationData.link}</code>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(invitationData.body);
                      alert('Message copied to clipboard!');
                    } catch (err) {
                      console.error('Copy failed:', err);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded hover:bg-primary/80"
                >
                  📋 Copy Message
                </button>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(invitationData.link);
                      alert('Link copied to clipboard!');
                    } catch (err) {
                      console.error('Copy failed:', err);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  🔗 Copy Link
                </button>
                <button
                  onClick={() => {
                    window.location.href = `mailto:${invitationData.email}?subject=${encodeURIComponent(invitationData.subject)}&body=${encodeURIComponent(invitationData.body)}`;
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  📧 Open Email Client
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ============================================================
   Small subcomponents (Tailwind-styled)
   These mirror the previous components but are cleaned.
   For brevity some complex UIs are simplified but extensible.
   ============================================================ */

function NavButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded ${active ? 'bg-primary text-white' : 'hover:bg-neutral-100'}`}
    >
      {label}
    </button>
  );
}


/* ---------------------
   InvitedList helper
   --------------------- */
   function InvitedList({ speakers, onResendInvitation, onDeleteInvited, onViewAgenda, formatDate, canEdit, currentUserRole }) {
    if (!speakers || speakers.length === 0) return <p className="text-sm text-neutral-500">No pending invitations.</p>;
    
    return (
      <div className="space-y-2">
        {speakers.map(s => {
          const deadline = s.response_deadline ? safeToDate(s.response_deadline) : null;
          const isOverdue = deadline && deadline < new Date();
          
          return (
            <div key={s.id} className={`border rounded p-3 flex justify-between items-start ${isOverdue ? 'border-red-300 bg-red-50' : ''}`}>
              <div>
                <div className="flex items-center gap-2">
                  <div className="font-semibold">{s.full_name}</div>
                  {isOverdue && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-semibold rounded">
                      OVERDUE
                    </span>
                  )}
                </div>
                <div className="text-sm text-neutral-600">{s.area_of_expertise} • {s.affiliation}</div>
                <div className="text-xs text-neutral-500 mt-1">
                  Invited: {formatDate(s.invitation_sent_date)} • Deadline: {formatDate(s.response_deadline)}
                  {isOverdue && <span className="text-red-600 font-semibold ml-2">⚠ Response overdue!</span>}
                  <br />Host: {s.host}
                </div>
              </div>
              {(currentUserRole === 'Organizer' || canEdit(s)) && (
                <div className="space-y-1">
                  <button onClick={() => onResendInvitation(s)} className={`px-2 py-1 text-white text-xs rounded w-full ${isOverdue ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                    {isOverdue ? 'Resend (Overdue)' : 'Resend'}
                  </button>
                  {currentUserRole === 'Organizer' && (
                    <button onClick={() => onDeleteInvited(s.id)} className="px-2 py-1 bg-red-500 text-white text-xs rounded w-full hover:bg-red-600">Delete</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  
/* ---------------------
   LoginView & SignupView
   --------------------- */
function LoginView({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="bg-white rounded-lg shadow p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Sign in</h2>
        <input className="w-full border rounded px-3 py-2 mb-3" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" className="w-full border rounded px-3 py-2 mb-3" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        <div className="flex justify-end">
          <button onClick={() => onLogin(email, password)} className="px-4 py-2 bg-primary text-white rounded">Login</button>
        </div>
      </div>
    </div>
  );
}

function SignupView({ invitation, onSignup }) {
  const [password, setPassword] = useState('');
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="bg-white rounded-lg shadow p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Complete signup for {invitation.email}</h2>
        <p className="text-sm text-neutral-600 mb-3">Invitation for: <strong>{invitation.full_name}</strong></p>
        <input type="password" className="w-full border rounded px-3 py-2 mb-3" placeholder="Choose a password" value={password} onChange={e => setPassword(e.target.value)} />
        <div className="flex justify-end">
          <button onClick={() => onSignup(password)} className="px-4 py-2 bg-primary text-white rounded">Create account</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------
   SpeakerAccessView (for token-accessed speakers) - REDESIGNED
   --------------------- */
   function SpeakerAccessView({ speaker, availableDates, userAvailability, pastSpeakers, onAccept, onDecline, formatDate }) {
    const [selectedDateId, setSelectedDateId] = useState('');
    const [talkTitle, setTalkTitle] = useState(speaker.talk_title || '(TBC)');
    const [talkAbstract, setTalkAbstract] = useState(speaker.talk_abstract || '(TBC)');
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmationType, setConfirmationType] = useState('');
    const [showStatistics, setShowStatistics] = useState(false);
    
    // Initialize to first available date's month
    const getInitialMonth = () => {
      const available = availableDates.filter(d => d.available && (!d.locked_by_id || d.locked_by_id === 'DELETED'));
      if (available.length === 0) return new Date();
      const firstDate = available[0].date?.toDate ? available[0].date.toDate() : new Date(available[0].date);
      return new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
    };
    
    const [currentMonth, setCurrentMonth] = useState(getInitialMonth());

    if (showConfirmation) {
      return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-8">
          <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-8 text-center">
            {confirmationType === 'accept' ? (
              <>
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-3xl font-bold text-green-600 mb-4">Thank You!</h2>
                <p className="text-lg text-neutral-700 mb-4">
                  Thank you for accepting our invitation! We are delighted to have you join us.
                </p>
                <p className="text-neutral-600">
                  We will contact you shortly about your travel and accommodation arrangements, 
                  which are fully covered by the Barcelona Collaboratorium.
                </p>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">🙏</div>
                <h2 className="text-3xl font-bold text-neutral-700 mb-4">Thank You</h2>
                <p className="text-lg text-neutral-700">
                  Thank you for taking the time to consider our offer. 
                  We appreciate your response and hope to have the opportunity to work together in the future.
                </p>
              </>
            )}
          </div>
        </div>
      );
    }
  
    const getDaysInMonth = (date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();
      return { daysInMonth, startingDayOfWeek, year, month };
    };
  
    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
  
    const previousMonth = () => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };
  
    const nextMonth = () => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };
  
    const getDateInfo = (day) => {
      const checkDate = new Date(year, month, day);
      checkDate.setHours(0, 0, 0, 0);
      
      // Only show dates in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (checkDate <= today) return null;
      
      const dateEntry = availableDates.find(d => {
        // Must be available and not locked by anyone
        if (!d.available || (d.locked_by_id && d.locked_by_id !== 'DELETED')) return false;
        
        const entryDate = d.date?.toDate ? d.date.toDate() : new Date(d.date);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate.getTime() === checkDate.getTime();
      });
  
      return dateEntry;
    };
  
    const selectedDate = availableDates.find(d => d.id === selectedDateId);
  
    const handleAccept = () => {
      if (!selectedDateId) {
        alert('Please select a date');
        return;
      }
      onAccept(selectedDateId, talkTitle, talkAbstract);
      setConfirmationType('accept');
      setShowConfirmation(true);
    };
  
    const handleDecline = () => {
      if (window.confirm('Are you sure you want to decline this invitation?')) {
        onDecline();
        setConfirmationType('decline');
        setShowConfirmation(true);
      }
    };
  
    return (
      <div className="min-h-screen bg-neutral-50 p-8">
        <div className="w-full max-w-5xl mx-auto bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">
              Barcelona Collaboratorium Seminar Invitation
            </h1>
            <p className="text-neutral-600">
              Invitation for: <strong>{speaker.full_name}</strong> ({speaker.affiliation})
            </p>
          </div>
  
          {/* Invitation Letter */}
          <div className="bg-neutral-50 rounded-lg p-6 mb-8 leading-relaxed">
            <p className="mb-4">Dear {speaker.full_name},</p>
            
            <p className="mb-4">
              We are delighted to invite you to give a talk at the{' '}
              <a 
                href="https://barcelonacollaboratorium.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary font-semibold hover:underline"
              >
                Barcelona Collaboratorium for Modelling and Predictive Biology Seminar Series
              </a>.
            </p>
  
            <p className="mb-4">
              Here is a list of our{' '}
              <button
                onClick={() => setShowStatistics(true)}
                className="text-primary font-semibold hover:underline cursor-pointer bg-transparent border-none p-0"
              >
                past speakers
              </button>.
            </p>
  
            <p className="mb-4">
              Your suggested host for the seminar is <strong>{speaker.host}</strong>.
            </p>
  
            <p className="mb-4">
              <strong>Travel and accommodation expenses are fully covered by the Barcelona Collaboratorium.</strong>
            </p>
  
            <p className="mb-4">
              Please let us know if you accept our invitation, and, if so, choose a preferred date below.
            </p>
  
            <p>
              Best regards,<br />
              The Barcelona Collaboratorium Team
            </p>
          </div>
  
          {/* Talk Details */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Talk Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Talk Title</label>
                <input 
                  className="w-full border rounded-lg px-4 py-2" 
                  value={talkTitle} 
                  onChange={(e) => setTalkTitle(e.target.value)}
                  placeholder="Enter your talk title or leave as (TBC)"
                />
              </div>
  
              <div>
                <label className="block text-sm font-medium mb-2">Talk Abstract</label>
                <textarea 
                  className="w-full border rounded-lg px-4 py-2 min-h-[120px]" 
                  value={talkAbstract} 
                  onChange={(e) => setTalkAbstract(e.target.value)}
                  placeholder="Enter your talk abstract or leave as (TBC)"
                />
              </div>
            </div>
          </div>
  
          {/* Date Selection Calendar */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Choose Your Preferred Date</h2>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Left: Calendar */}
              <div className="border rounded-lg p-4">
                {/* Calendar Header */}
                <div className="flex justify-between items-center mb-3">
                  <button onClick={previousMonth} className="px-3 py-1 bg-primary text-white rounded hover:bg-primary/80 text-sm">
                    ←
                  </button>
                  <h3 className="text-base font-semibold">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  <button onClick={nextMonth} className="px-3 py-1 bg-primary text-white rounded hover:bg-primary/80 text-sm">
                    →
                  </button>
                </div>

                {/* Day names */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                    <div key={idx} className="text-center font-semibold text-xs text-neutral-600 py-1">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells */}
                  {Array.from({ length: startingDayOfWeek }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="aspect-square"></div>
                  ))}

                  {/* Days */}
                  {Array.from({ length: daysInMonth }).map((_, idx) => {
                    const day = idx + 1;
                    const dateEntry = getDateInfo(day);
                    
                    let bgColor = 'bg-neutral-100 text-neutral-400';
                    let cursor = 'cursor-default';
                    let hoverClass = '';
                    
                    if (dateEntry) {
                      cursor = 'cursor-pointer';
                      if (dateEntry.id === selectedDateId) {
                        bgColor = 'bg-primary text-white';
                        hoverClass = 'hover:bg-primary/80';
                      } else {
                        bgColor = 'bg-green-500 text-white';
                        hoverClass = 'hover:bg-green-600';
                      }
                    }

                    return (
                      <div
                        key={day}
                        onClick={() => dateEntry && setSelectedDateId(dateEntry.id)}
                        className={`aspect-square flex items-center justify-center rounded text-sm ${bgColor} ${cursor} ${hoverClass} transition-colors`}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 text-xs text-neutral-600">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Available dates</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-neutral-100 rounded"></div>
                    <span>Not available</span>
                  </div>
                </div>
              </div>

              {/* Right: Selected Date Info & Available Users */}
              <div className="space-y-4">
                {selectedDate ? (
                  <>
                    {/* Selected Date Card */}
                    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                      <h4 className="font-semibold text-lg mb-3 text-blue-900">Selected Date</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-700 font-medium">📅 Date:</span>
                          <span className="font-semibold">{formatDate(selectedDate.date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-700 font-medium">👤 Host:</span>
                          <span className="font-semibold">{selectedDate.host}</span>
                        </div>
                        {selectedDate.notes && (
                          <div className="flex items-start gap-2">
                            <span className="text-blue-700 font-medium">📍 Location:</span>
                            <span>{selectedDate.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Available Fellows */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        Available Fellows
                      </h4>
                      <div className="space-y-2">
                        {userAvailability
                          .filter(ua => ua.date_id === selectedDateId && ua.available !== false)
                          .length > 0 ? (
                          <div className="space-y-2">
                            {userAvailability
                              .filter(ua => ua.date_id === selectedDateId && ua.available !== false)
                              .map((ua, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm bg-green-50 px-3 py-2 rounded">
                                  <span className="text-green-600">✓</span>
                                  <span>{ua.user_name}</span>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <p className="text-sm text-neutral-500 italic">
                            All fellows are available on this date
                          </p>
                        )}
                      </div>

                      {/* Unavailable Fellows */}
                      {userAvailability.filter(ua => ua.date_id === selectedDateId && ua.available === false).length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <h5 className="font-medium text-sm mb-2 flex items-center gap-2 text-neutral-600">
                            <span className="text-red-600">✗</span>
                            Unavailable
                          </h5>
                          <div className="space-y-2">
                            {userAvailability
                              .filter(ua => ua.date_id === selectedDateId && ua.available === false)
                              .map((ua, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm bg-red-50 px-3 py-2 rounded">
                                  <span className="text-red-600">✗</span>
                                  <span className="text-neutral-600">{ua.user_name}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center">
                    <p className="text-neutral-500 mb-2">📅</p>
                    <p className="text-neutral-600 font-medium">Select a date from the calendar</p>
                    <p className="text-sm text-neutral-500 mt-1">
                      Available dates are shown in green
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
  
          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <button 
              onClick={handleDecline} 
              className="px-6 py-3 border-2 border-neutral-300 text-neutral-700 rounded-lg font-semibold hover:bg-neutral-100 transition-colors"
            >
              Decline Invitation
            </button>
            <button 
              onClick={handleAccept}
              disabled={!selectedDateId}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                selectedDateId 
                  ? 'bg-primary text-white hover:bg-primary/80' 
                  : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
              }`}
            >
              Accept & Schedule
            </button>
          </div>
        </div>
  
        {/* Statistics Modal - Full StatisticsView */}
        {showStatistics && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowStatistics(false)}
          >
            <div 
              className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b flex items-center justify-between bg-primary text-white sticky top-0 z-10">
                <h2 className="text-2xl font-bold">Past Speakers</h2>
                <button 
                  onClick={() => setShowStatistics(false)}
                  className="text-white hover:text-neutral-200"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-6">
                <StatisticsView 
                  speakers={pastSpeakers} 
                  formatDate={formatDate}
                  onAddPastSpeaker={() => {}} // Not needed for speaker view
                  isOrganizer={false} // Hide organizer-only features
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

/* ---------------------
   DashboardView
   (Simplified but includes lists, actions, and charts)
   --------------------- */
   function DashboardView({
    userRole, speakers, availableDates,
    upcomingLunchReminders,
    onAcceptSpeaker, onRejectSpeaker, onResendInvitation, onEditSpeaker,
    onEditConfirmed, onViewActions, onViewAgenda, onGeneratePoster, onDeleteInvited,
    onVoteSpeaker, currentUser, getRankingColor, getStatusColor, formatDate
  }) {
    const [dismissedAlerts, setDismissedAlerts] = useState(new Set());
    const [dismissedLunchReminders, setDismissedLunchReminders] = useState(new Set());
  
    // Get recent speaker responses (last 7 days)
    const getRecentResponses = () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      return speakers.filter(speaker => {
        if (!speaker.actions || speaker.actions.length === 0) return false;
        const responseAction = speaker.actions.find(a => a.type === 'speaker_responded');
        if (!responseAction) return false;
        const responseDate = new Date(responseAction.timestamp);
        return responseDate >= sevenDaysAgo && !dismissedAlerts.has(speaker.id);
      }).sort((a, b) => {
        const aAction = a.actions.find(act => act.type === 'speaker_responded');
        const bAction = b.actions.find(act => act.type === 'speaker_responded');
        return new Date(bAction.timestamp) - new Date(aAction.timestamp);
      });
    };
  
    const recentResponses = getRecentResponses();
    const proposedSpeakers = speakers.filter(s => s.status === 'Proposed');
    const invitedSpeakers = speakers.filter(s => s.status === 'Invited');
    
    // Only show UPCOMING speakers
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingSpeakers = speakers.filter(s => {
      if (s.status !== 'Accepted') return false;
      if (!s.assigned_date) return false;
      const speakerDate = s.assigned_date.toDate ? s.assigned_date.toDate() : new Date(s.assigned_date);
      return speakerDate >= today;
    });
  
    // Calculate overdue speakers
    const overdueSpeakers = invitedSpeakers.filter(s => {
      if (!s.response_deadline) return false;
      const deadline = safeToDate(s.response_deadline);
      return deadline < new Date();
    });
  
    const canEditSpeaker = (speaker) => {
      if (currentUser.role === 'Organizer') return true;
      return speaker.host === currentUser.full_name;
    };
  
    // Filter lunch reminders that haven't been dismissed
    const visibleLunchReminders = upcomingLunchReminders 
      ? upcomingLunchReminders.filter(s => !dismissedLunchReminders.has(s.id))
      : [];
  
    return (
      <div className="space-y-6">
        {/* Lunch Reservation Reminders */}
        {visibleLunchReminders.length > 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg shadow-md p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-3xl">🍽️</span>
                  <h4 className="font-bold text-amber-900 text-lg">Lunch Reservation Reminders</h4>
                </div>
                <div className="space-y-3">
                  {visibleLunchReminders.map(speaker => (
                    <div key={speaker.id} className="flex items-start justify-between bg-white rounded-lg p-3 border border-amber-200">
                      <div className="flex-1">
                        <div className="font-semibold text-amber-900">{speaker.full_name}</div>
                        <div className="text-sm text-amber-700 mt-1">
                          Seminar in one week: <strong>{formatDate(speaker.assigned_date)}</strong>
                        </div>
                        <div className="text-xs text-amber-600 mt-1">
                          📍 Don't forget to make lunch reservations!
                        </div>
                      </div>
                      <button
                        onClick={() => setDismissedLunchReminders(prev => new Set([...prev, speaker.id]))}
                        className="text-amber-500 hover:text-amber-700 ml-2"
                        title="Dismiss"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
  
        {/* Overview Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-neutral-500 font-medium">Proposed</div>
            <div className="text-3xl font-bold text-primary mt-2">{proposedSpeakers.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-neutral-500 font-medium">Invited</div>
            <div className="text-3xl font-bold text-primary mt-2">{invitedSpeakers.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-neutral-500 font-medium">Upcoming</div>
            <div className="text-3xl font-bold text-primary mt-2">{upcomingSpeakers.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <div className="text-sm text-red-600 font-semibold">Overdue</div>
            <div className="text-3xl font-bold text-red-600 mt-2">{overdueSpeakers.length}</div>
          </div>
        </div>
  
        {/* Proposed Speakers */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4 text-neutral-800">
            Proposed Speakers Awaiting Review ({proposedSpeakers.length})
          </h3>
          {proposedSpeakers.length === 0 ? (
            <p className="text-neutral-500 text-center py-8">No proposed speakers</p>
          ) : (
            <div className="space-y-3">
              {proposedSpeakers.map(s => {
                const userVoted = s.votes?.some(v => v.user_id === currentUser.id);
                const voteCount = s.votes?.length || 0;
                return (
                  <div key={s.id} className="border border-neutral-200 rounded-lg p-4 hover:border-primary transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold text-lg text-neutral-800">{s.full_name}</div>
                        <div className="text-sm text-neutral-600 mt-1">
                          {s.area_of_expertise} • {s.affiliation} • {s.country}
                        </div>
                        <div className="text-xs text-neutral-500 mt-2">
                          Proposed by {s.proposed_by_name} • Host: {s.host}
                        </div>
                        {s.notes && (
                          <div className="text-sm text-neutral-600 mt-2 italic bg-neutral-50 p-2 rounded">
                            {s.notes}
                          </div>
                        )}
                        <div className="mt-2">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-white ${getRankingColor(s.ranking)}`}>
                            {s.ranking}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => onVoteSpeaker(s.id, 'upvote')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            userVoted 
                              ? 'bg-primary text-white' 
                              : 'border-2 border-primary text-primary hover:bg-primary hover:text-white'
                          }`}
                        >
                          👍 {voteCount}
                        </button>
                        {currentUser.role === 'Organizer' && (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => onAcceptSpeaker(s.id)} 
                              className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors"
                            >
                              Invite
                            </button>
                            <button 
                              onClick={() => onRejectSpeaker(s.id)} 
                              className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
  
        {/* Invited Speakers */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4 text-neutral-800">
            Invited Speakers Awaiting Response ({invitedSpeakers.length})
          </h3>
          <InvitedList
            speakers={invitedSpeakers}
            onResendInvitation={onResendInvitation}
            onDeleteInvited={onDeleteInvited}
            onViewAgenda={onViewAgenda}
            formatDate={formatDate}
            canEdit={(s) => canEditSpeaker(s)}
            currentUserRole={currentUser.role}
          />
        </div>
  
        {/* Confirmed Upcoming Speakers */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4 text-neutral-800">
            Confirmed Upcoming Speakers ({upcomingSpeakers.length})
          </h3>
          {upcomingSpeakers.length === 0 ? (
            <p className="text-neutral-500 text-center py-8">No upcoming confirmed speakers</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-neutral-200">
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700">Title</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700">Host</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingSpeakers.map(s => (
                    <tr key={s.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="py-3 px-4">{s.full_name}</td>
                      <td className="py-3 px-4">{s.talk_title || '(TBC)'}</td>
                      <td className="py-3 px-4">{formatDate(s.assigned_date)}</td>
                      <td className="py-3 px-4">{s.host}</td>
                      <td className="py-3 px-4">
                        {canEditSpeaker(s) && (
                          <div className="flex gap-2">
                            <button onClick={() => onViewAgenda(s)} className="px-3 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600">Agenda</button>
                            <button onClick={() => onEditConfirmed(s)} className="px-3 py-1 bg-amber-500 text-white rounded text-xs hover:bg-amber-600">Edit</button>
                            <button onClick={() => onViewActions(s)} className="px-3 py-1 bg-sky-500 text-white rounded text-xs hover:bg-sky-600">Actions</button>
                          </div>
                        )}
                        {!canEditSpeaker(s) && (
                          <span className="text-xs text-neutral-400">Host only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
  
        {/* Recent Speaker Responses - AT BOTTOM */}
        {recentResponses.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4 text-neutral-800 flex items-center gap-2">
              <span className="text-2xl">📬</span>
              Recent Speaker Responses
            </h3>
            <div className="space-y-3">
              {recentResponses.map(speaker => {
                const responseAction = speaker.actions.find(a => a.type === 'speaker_responded');
                const isRelevantToUser = 
                  currentUser.role === 'Organizer' || 
                  speaker.host === currentUser.full_name ||
                  speaker.proposed_by_id === currentUser.id;
                
                return (
                  <div 
                    key={speaker.id}
                    className={`border-l-4 rounded-lg p-4 ${
                      isRelevantToUser ? 'bg-blue-50 border-blue-500' : 'bg-neutral-50 border-neutral-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">
                            {responseAction.action === 'accepted' ? '✅' : '❌'}
                          </span>
                          <div>
                            <div className="font-semibold text-neutral-800">{speaker.full_name}</div>
                            <div className="text-sm text-neutral-600">
                              {responseAction.action === 'accepted' ? 'accepted' : 'declined'} the invitation
                            </div>
                          </div>
                          {isRelevantToUser && (
                            <span className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs font-semibold rounded">
                              {speaker.host === currentUser.full_name ? 'You are host' : 
                               speaker.proposed_by_id === currentUser.id ? 'Your proposal' : 
                               'Organizer'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-500 ml-8">
                          {new Date(responseAction.timestamp).toLocaleString()}
                          {responseAction.action === 'accepted' && speaker.assigned_date && (
                            <span className="ml-3">
                              📅 {formatDate(speaker.assigned_date)}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setDismissedAlerts(prev => new Set([...prev, speaker.id]))}
                        className="text-neutral-400 hover:text-neutral-600"
                        title="Dismiss"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

/* ---------------------
   AvailabilityView - Calendar Style with Side Panel
   --------------------- */
   function AvailabilityView({ dates, userAvailability, currentUser, onUpdateAvailability, formatDate }) {
    // Initialize to first available date's month
    const getInitialMonth = () => {
      if (dates.length === 0) return new Date();
      const firstDate = dates[0].date?.toDate ? dates[0].date.toDate() : new Date(dates[0].date);
      return new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
    };
    
    const [currentMonth, setCurrentMonth] = useState(getInitialMonth());
     
    if (!dates) return <div>Loading dates...</div>;
  
    const getDaysInMonth = (date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();
      
      return { daysInMonth, startingDayOfWeek, year, month };
    };
  
    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
  
    const previousMonth = () => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };
  
    const nextMonth = () => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };
  
    const getDateInfo = (day) => {
      const checkDate = new Date(year, month, day);
      checkDate.setHours(0, 0, 0, 0);
      
      const dateEntry = dates.find(d => {
        const entryDate = d.date?.toDate ? d.date.toDate() : new Date(d.date);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate.getTime() === checkDate.getTime();
      });
  
      if (!dateEntry) return null;
  
      const ua = userAvailability.find(u => u.user_id === currentUser.id && u.date_id === dateEntry.id);
      const available = ua ? ua.available : true;
  
      return { dateEntry, available };
    };
  
    const handleDateClick = (day) => {
      const dateInfo = getDateInfo(day);
      if (dateInfo) {
        onUpdateAvailability(dateInfo.dateEntry.id, !dateInfo.available);
      }
    };
  
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-6">My Availability</h2>
        
        {/* Legend */}
        <div className="flex gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span>Unavailable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-neutral-200 rounded"></div>
            <span>No seminar scheduled</span>
          </div>
        </div>
  
        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left: Calendar - Smaller */}
          <div className="border rounded-lg p-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <button onClick={previousMonth} className="px-3 py-1 bg-primary text-white rounded hover:bg-primary/80 text-sm">
                ←
              </button>
              <h3 className="text-base font-semibold">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <button onClick={nextMonth} className="px-3 py-1 bg-primary text-white rounded hover:bg-primary/80 text-sm">
                →
              </button>
            </div>
  
            {/* Day names */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <div key={idx} className="text-center font-semibold text-xs text-neutral-600 py-1">
                  {day}
                </div>
              ))}
            </div>
  
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: startingDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} className="aspect-square"></div>
              ))}
  
              {/* Days of the month */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const day = idx + 1;
                const dateInfo = getDateInfo(day);
                
                let bgColor = 'bg-neutral-100';
                let cursor = 'cursor-default';
                let hoverClass = '';
                
                if (dateInfo) {
                  cursor = 'cursor-pointer';
                  if (dateInfo.available) {
                    bgColor = 'bg-green-500 text-white';
                    hoverClass = 'hover:bg-green-600';
                  } else {
                    bgColor = 'bg-orange-500 text-white';
                    hoverClass = 'hover:bg-orange-600';
                  }
                }
  
                return (
                  <div
                    key={day}
                    onClick={() => dateInfo && handleDateClick(day)}
                    className={`aspect-square flex items-center justify-center rounded text-sm font-medium ${bgColor} ${cursor} ${hoverClass} transition-colors`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
  
          {/* Right: Scrollable List of Upcoming Seminars */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Upcoming Seminars</h3>
            {dates.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-8">No upcoming seminars scheduled.</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {dates.map(d => {
                  const ua = userAvailability.find(u => u.user_id === currentUser.id && u.date_id === d.id);
                  const available = ua ? ua.available : true;
                  return (
                    <div key={d.id} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-base">{formatDate(d.date)}</div>
                          <div className="text-sm text-neutral-600 mt-1">
                            <strong>Host:</strong> {d.host}
                          </div>
                          {d.notes && (
                            <div className="text-xs text-neutral-500 mt-1">
                              📍 {d.notes}
                            </div>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${available ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                          {available ? '✓ Available' : '✗ Unavailable'}
                        </span>
                      </div>
                      <button 
                        onClick={() => onUpdateAvailability(d.id, !available)} 
                        className="w-full px-3 py-2 bg-primary text-white rounded text-sm hover:bg-primary/80 transition-colors"
                      >
                        {available ? 'Mark Unavailable' : 'Mark Available'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

/* ---------------------
   StatisticsView (charts and past speakers)
   --------------------- */
   function StatisticsView({ speakers, formatDate, onAddPastSpeaker, isOrganizer }) {
    const [selectedYear, setSelectedYear] = useState('all');
    const [collapsedYears, setCollapsedYears] = useState(new Set());
    
    const acceptedSpeakers = speakers.filter(s => s.status === 'Accepted');
    
    const getYearFromDate = (date) => {
      if (!date) return null;
      const d = date.toDate ? date.toDate() : new Date(date);
      return d.getFullYear();
    };
  
    const toggleYear = (year) => {
      setCollapsedYears(prev => {
        const newSet = new Set(prev);
        if (newSet.has(year)) {
          newSet.delete(year);
        } else {
          newSet.add(year);
        }
        return newSet;
      });
    };
  
    // Filter speakers by selected year
    const filteredSpeakers = selectedYear === 'all' 
      ? acceptedSpeakers 
      : acceptedSpeakers.filter(s => getYearFromDate(s.assigned_date) === parseInt(selectedYear));
  
    const speakersByYear = acceptedSpeakers.reduce((acc, s) => {
      const year = getYearFromDate(s.assigned_date);
      if (year) {
        if (!acc[year]) acc[year] = [];
        acc[year].push(s);
      }
      return acc;
    }, {});
  
    const availableYears = Object.keys(speakersByYear).sort();
  
    const yearData = Object.keys(speakersByYear)
      .sort()
      .map(year => ({
        year,
        count: speakersByYear[year].length
      }));
  
    const countryData = filteredSpeakers.reduce((acc, s) => {
      const country = s.country || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {});
  
    const topCountries = Object.entries(countryData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }));
  
    const uniqueAffiliations = new Set(
      filteredSpeakers
        .map(s => s.affiliation)
        .filter(a => a && a.trim())
    );
    const affiliationCount = uniqueAffiliations.size;
  
    const getRegion = (country) => {
      if (!country) return 'Unknown';
      if (country === 'Spain') return 'Spain';
      
      const europeanCountries = ['Austria', 'Belgium', 'Denmark', 'France', 'Germany', 'Italy', 
        'Netherlands', 'Switzerland', 'United Kingdom', 'Sweden', 'Norway', 'Bulgaria', 'Croatia', 
        'Cyprus', 'Czech Republic', 'Estonia', 'Finland', 'Greece', 'Hungary', 'Ireland', 'Latvia', 
        'Lithuania', 'Luxembourg', 'Malta', 'Poland', 'Portugal', 'Romania', 'Slovakia', 'Slovenia'];
      if (europeanCountries.includes(country)) return 'Europe (excl. Spain)';
      
      const northAmerica = ['United States', 'Canada', 'Mexico'];
      if (northAmerica.includes(country)) return 'North America';
      
      const asia = ['China', 'Japan', 'India', 'South Korea', 'Singapore', 'Thailand', 'Vietnam', 'Indonesia', 'Malaysia', 'Philippines'];
      if (asia.includes(country)) return 'Asia';
      
      const oceania = ['Australia', 'New Zealand'];
      if (oceania.includes(country)) return 'Oceania';
      
      return 'Other';
    };
  
    const regionData = filteredSpeakers.reduce((acc, s) => {
      const region = getRegion(s.country);
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {});
  
    const regionChartData = Object.entries(regionData).map(([region, count]) => ({
      name: region,
      value: count
    }));
  
    const COLORS = ['#d63447', '#3498db', '#e67e22', '#f1c40f', '#2ecc71', '#95a5a6'];
  
    const handleExportCSV = () => {
      const headers = ['Name', 'Affiliation', 'Country', 'Email', 'Date', 'Talk Title', 'Host', 'Area of Expertise'];
      const rows = filteredSpeakers
        .sort((a, b) => {
          const dateA = a.assigned_date?.toDate ? a.assigned_date.toDate() : new Date(a.assigned_date);
          const dateB = b.assigned_date?.toDate ? b.assigned_date.toDate() : new Date(b.assigned_date);
          return dateB - dateA;
        })
        .map(speaker => [
          speaker.full_name,
          speaker.affiliation,
          speaker.country || 'N/A',
          speaker.email || 'N/A',
          formatDate(speaker.assigned_date),
          speaker.talk_title || 'N/A',
          speaker.host || 'N/A',
          speaker.area_of_expertise || 'N/A'
        ]);
  
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
  
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const filename = selectedYear === 'all' 
        ? `past_speakers_all_${new Date().toISOString().split('T')[0]}.csv`
        : `past_speakers_${selectedYear}_${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
  
    const handleExportPDF = async () => {
      try {
        const statisticsElement = document.getElementById('statistics-charts-only');
        if (!statisticsElement) {
          alert('Statistics content not found');
          return;
        }
  
        const html2canvas = await import('html2canvas');
        const canvas = await html2canvas.default(statisticsElement, {
          scale: 2,
          backgroundColor: '#ffffff',
          logging: false,
          useCORS: true
        });
  
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const filename = selectedYear === 'all'
            ? `speaker_statistics_all_${new Date().toISOString().split('T')[0]}.png`
            : `speaker_statistics_${selectedYear}_${new Date().toISOString().split('T')[0]}.png`;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        });
      } catch (error) {
        console.error('Error generating statistics export:', error);
        alert('Error generating statistics export.');
      }
    };
  
    return (
      <div id="statistics-content">
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Past Speakers</h2>
          <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{...styles.select, width: 'auto', minWidth: '150px'}}
            >
              <option value="all">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button onClick={handleExportCSV} style={{...styles.addBtn, backgroundColor: '#3498db'}}>
              📊 Export CSV
            </button>
            <button onClick={handleExportPDF} style={{...styles.addBtn, backgroundColor: '#9b59b6'}}>
              📄 Export Charts (PNG)
            </button>
            {isOrganizer && (
              <button onClick={onAddPastSpeaker} style={styles.addBtn}>
                + Add Past Speaker
              </button>
            )}
          </div>
        </div>
        
        <div id="statistics-charts-only">
          <div style={{padding: '20px', backgroundColor: 'white', borderRadius: '8px', marginBottom: '25px'}}>
            <h3 style={{...styles.subsectionTitle, textAlign: 'center', marginBottom: '20px'}}>
              {selectedYear === 'all' ? 'All Years Statistics' : `${selectedYear} Statistics`}
            </h3>
            
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>{filteredSpeakers.length}</div>
                <div style={styles.statLabel}>Total Speakers</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>{Object.keys(countryData).length}</div>
                <div style={styles.statLabel}>Countries</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>{affiliationCount}</div>
                <div style={styles.statLabel}>Different Affiliations</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>
                  {selectedYear === 'all' ? Object.keys(speakersByYear).length : 1}
                </div>
                <div style={styles.statLabel}>Years</div>
              </div>
            </div>
  
            <div style={styles.chartsGrid}>
              {selectedYear === 'all' && (
                <div style={styles.chartBox}>
                  <h3 style={styles.chartTitle}>Speakers by Year</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={yearData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3498db" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
  
              <div style={styles.chartBox}>
                <h3 style={styles.chartTitle}>Distribution by Region</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={regionChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {regionChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
  
            {topCountries.length > 0 && (
              <div style={{...styles.chartBox, marginTop: '25px'}}>
                <h3 style={styles.chartTitle}>Top 10 Countries</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={topCountries} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="country" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#00BCD4" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
  
        <div style={styles.section}>
          <h3 style={styles.subsectionTitle}>
            {selectedYear === 'all' ? 'All Speakers by Year' : `Speakers in ${selectedYear}`}
          </h3>
          {Object.keys(speakersByYear)
            .sort((a, b) => b - a)
            .filter(year => selectedYear === 'all' || year === selectedYear)
            .map(year => {
              const isCollapsed = collapsedYears.has(year);
              return (
                <div key={year} style={styles.yearSection}>
                  <h4 
                    style={{
                      ...styles.yearTitle, 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                    onClick={() => toggleYear(year)}
                  >
                    <span>{year} ({speakersByYear[year].length} speakers)</span>
                    <span style={{fontSize: '20px'}}>{isCollapsed ? '▶' : '▼'}</span>
                  </h4>
                  {!isCollapsed && (
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Name</th>
                          <th style={styles.th}>Affiliation</th>
                          <th style={styles.th}>Country</th>
                          <th style={styles.th}>Date</th>
                          <th style={styles.th}>Talk Title</th>
                        </tr>
                      </thead>
                      <tbody>
                        {speakersByYear[year]
                          .sort((a, b) => {
                            const dateA = a.assigned_date?.toDate ? a.assigned_date.toDate() : new Date(a.assigned_date);
                            const dateB = b.assigned_date?.toDate ? b.assigned_date.toDate() : new Date(b.assigned_date);
                            return dateA - dateB;
                          })
                          .map(speaker => (
                            <tr key={speaker.id}>
                              <td style={styles.td}>{speaker.full_name}</td>
                              <td style={styles.td}>{speaker.affiliation}</td>
                              <td style={styles.td}>{speaker.country || 'N/A'}</td>
                              <td style={styles.td}>{formatDate(speaker.assigned_date)}</td>
                              <td style={styles.td}>{speaker.talk_title || 'TBD'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    );
  }

/* ---------------------
   DatesView - Updated to match AvailabilityView layout
   --------------------- */
   function DatesView({ dates, speakers, onAddDate, onDeleteDate, formatDate }) {
    const getInitialMonth = () => {
      if (dates.length === 0) return new Date();
      const firstDate = dates[0].date?.toDate ? dates[0].date.toDate() : new Date(dates[0].date);
      return new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
    };
    
    const [currentMonth, setCurrentMonth] = useState(getInitialMonth());
  
    const getDaysInMonth = (date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();
      
      return { daysInMonth, startingDayOfWeek, year, month };
    };
  
    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
  
    const previousMonth = () => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };
  
    const nextMonth = () => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };
  
    const getDateInfo = (day) => {
      const checkDate = new Date(year, month, day);
      checkDate.setHours(0, 0, 0, 0);
      
      const dateEntry = dates.find(d => {
        const entryDate = d.date?.toDate ? d.date.toDate() : new Date(d.date);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate.getTime() === checkDate.getTime();
      });
  
      return dateEntry;
    };
  
    // Get speaker name for locked date
    const getSpeakerForDate = (dateEntry) => {
      if (!dateEntry.locked_by_id || dateEntry.locked_by_id === 'DELETED') return null;
      const speaker = speakers.find(s => s.id === dateEntry.locked_by_id);
      return speaker ? speaker.full_name : 'Unknown';
    };
  
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Available Dates</h2>
          <button onClick={onAddDate} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/80">
            + Add Date
          </button>
        </div>
        
        {/* Legend */}
        <div className="flex gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Locked (speaker assigned)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-neutral-200 rounded"></div>
            <span>No date scheduled</span>
          </div>
        </div>
  
        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left: Calendar */}
          <div className="border rounded-lg p-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <button onClick={previousMonth} className="px-3 py-1 bg-primary text-white rounded hover:bg-primary/80 text-sm">
                ←
              </button>
              <h3 className="text-base font-semibold">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <button onClick={nextMonth} className="px-3 py-1 bg-primary text-white rounded hover:bg-primary/80 text-sm">
                →
              </button>
            </div>
  
            {/* Day names */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <div key={idx} className="text-center font-semibold text-xs text-neutral-600 py-1">
                  {day}
                </div>
              ))}
            </div>
  
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells */}
              {Array.from({ length: startingDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} className="aspect-square"></div>
              ))}
  
              {/* Days */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const day = idx + 1;
                const dateEntry = getDateInfo(day);
                
                let bgColor = 'bg-neutral-100';
                let textColor = '';
                
                if (dateEntry) {
                  if (dateEntry.available) {
                    bgColor = 'bg-green-500';
                    textColor = 'text-white';
                  } else {
                    bgColor = 'bg-red-500';
                    textColor = 'text-white';
                  }
                }
  
                return (
                  <div
                    key={day}
                    className={`aspect-square flex items-center justify-center rounded text-sm font-medium ${bgColor} ${textColor}`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
  
          {/* Right: Scrollable List of All Dates */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">All Scheduled Dates</h3>
            {dates.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-8">No dates scheduled yet.</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {dates.map(d => {
                  const speakerName = getSpeakerForDate(d);
                  const isLocked = !d.available;
                  
                  return (
                    <div key={d.id} className={`border rounded-lg p-3 ${isLocked ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-base">{formatDate(d.date)}</div>
                          <div className="text-sm text-neutral-600 mt-1">
                            <strong>Host:</strong> {d.host}
                          </div>
                          {d.notes && (
                            <div className="text-xs text-neutral-500 mt-1">
                              📍 {d.notes}
                            </div>
                          )}
                          {speakerName && (
                            <div className="text-xs text-red-700 font-semibold mt-1">
                              🔒 Locked by: {speakerName}
                            </div>
                          )}
                          {d.talk_title && (
                            <div className="text-xs text-neutral-600 mt-1 italic">
                              "{d.talk_title}"
                            </div>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isLocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {isLocked ? '🔒 Locked' : '✓ Available'}
                        </span>
                      </div>
                      {d.available && (
                        <button 
                          onClick={() => onDeleteDate(d.id)} 
                          className="w-full px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                        >
                          Delete Date
                        </button>
                      )}
                      {!d.available && (
                        <div className="text-xs text-neutral-500 italic text-center py-2">
                          Cannot delete locked dates
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

/* ---------------------
   ManageUsersView
   --------------------- */
   function ManageUsersView({ users, currentUserId, onEditUser, onDeleteUser, onPasswordReset, formatDate }) {
    return (
      <div className="bg-white rounded shadow p-4">
        <h2 className="text-lg font-medium mb-3">Manage Users</h2>
        {users.length === 0 ? <p className="text-sm text-neutral-500">No users found.</p> : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="py-2">Email</th>
                <th className="py-2">Name</th>
                <th className="py-2">Role</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t">
                  <td className="py-2">{u.email}</td>
                  <td className="py-2">{u.full_name}</td>
                  <td className="py-2">{u.role}</td>
                  <td className="py-2 space-x-2">
                    <button onClick={() => onEditUser(u)} className="px-2 py-1 bg-yellow-500 text-white rounded text-xs">Edit</button>
                    <button onClick={() => onPasswordReset(u.email, u.full_name)} className="px-2 py-1 bg-sky-600 text-white rounded text-xs">Reset PW</button>
                    {u.id !== currentUserId && <button onClick={() => onDeleteUser(u.id, u.email)} className="px-2 py-1 bg-red-500 text-white rounded text-xs">Remove</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

/* ---------------------
   InvitationsView
   --------------------- */
function InvitationsView({ invitations, onCreateInvitation, formatDate }) {
  return (
    <div className="bg-white rounded shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-medium">User Invitations</h2>
        <button onClick={onCreateInvitation} className="px-3 py-1 bg-primary text-white rounded">Create Invitation</button>
      </div>
      {invitations.length === 0 ? <p className="text-sm text-neutral-500">No invitations.</p> : (
        <ul className="space-y-2">
          {invitations.map(inv => (
            <li key={inv.id} className="flex items-center justify-between border rounded p-3">
              <div>
                <div className="font-semibold">{inv.full_name}</div>
                <div className="text-sm text-neutral-600">{inv.email} • Expires {formatDate(inv.expires_at)}</div>
              </div>
              <div className="text-sm text-neutral-500">{inv.used ? 'Used' : 'Pending'}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------------
   ProposeSpeakerView
   --------------------- */
function ProposeSpeakerView({ onAddSpeaker, speakers, onEditSpeaker, onDeleteSpeaker, getRankingColor, getStatusColor, formatDate }) {
  return (
    <div className="bg-white rounded shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-medium">My Proposals</h2>
        <button onClick={onAddSpeaker} className="px-3 py-1 bg-primary text-white rounded">Propose Speaker</button>
      </div>
      {speakers.length === 0 ? <p className="text-sm text-neutral-500">You have not proposed any speakers.</p> : (
        <div className="space-y-2">
          {speakers.map(s => (
            <div key={s.id} className="border rounded p-3 flex justify-between">
              <div>
                <div className="font-semibold">{s.full_name}</div>
                <div className="text-sm text-neutral-600">{s.area_of_expertise} • {s.affiliation}</div>
                <div className="text-xs mt-1"><span className="font-medium">Status:</span> <span className={getStatusColor(s.status)}>{s.status}</span></div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => onEditSpeaker(s)} className="px-2 py-1 bg-yellow-500 text-white rounded text-xs">Edit</button>
                <button onClick={() => onDeleteSpeaker(s.id)} className="px-2 py-1 bg-red-500 text-white rounded text-xs">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------
   ProfileView
   --------------------- */
function ProfileView({ userRole, onEditProfile }) {
  return (
    <div className="bg-white rounded shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">My Profile</h2>
        <button onClick={onEditProfile} className="px-3 py-1 bg-primary text-white rounded">Edit Profile</button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-neutral-500">Email</div>
          <div className="font-semibold">{userRole?.email}</div>
        </div>
        <div>
          <div className="text-sm text-neutral-500">Name</div>
          <div className="font-semibold">{userRole?.full_name}</div>
        </div>
        <div>
          <div className="text-sm text-neutral-500">Affiliation</div>
          <div className="font-semibold">{userRole?.affiliation}</div>
        </div>
        <div>
          <div className="text-sm text-neutral-500">Role</div>
          <div className="font-semibold">{userRole?.role}</div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Sidebars & Forms (modals)
   - ActionsSidebar, AgendaSidebar, PosterSidebar
   - AddDateForm, AddSpeakerForm, AddPastSpeakerForm, Edit forms
   ============================================================ */

   function ActionsSidebar({ speaker, onClose, onUpdateAction, onAddAction, currentUser, formatDate }) {
    const [collapsedCards, setCollapsedCards] = useState(new Set());
    
    const inviteLink = `${window.location.origin}?token=${speaker.access_token}`;
    const emailSubject = 'Invitation to Present at Collaboratorium Barcelona';
    const emailBody = `Dear ${speaker.full_name},
  
  We are delighted to invite you to present a seminar at the Collaboratorium for Theoretical Modelling and Predictive Biology in Barcelona.
  
  Your host will be ${speaker.host}.
  
  Please visit the following link to accept and choose your preferred date:
  ${inviteLink}
  
  This invitation will remain valid for 7 days. If you have any questions, please don't hesitate to reach out.
  
  Best regards,
  ${currentUser.full_name}`;
  
    const actions = speaker.actions || [];
    
    // Toggle card collapse state
    const toggleCard = (cardId) => {
      setCollapsedCards(prev => {
        const newSet = new Set(prev);
        if (newSet.has(cardId)) {
          newSet.delete(cardId);
        } else {
          newSet.add(cardId);
        }
        return newSet;
      });
    };
    
    const isCardCollapsed = (cardId) => collapsedCards.has(cardId);
    
    // Check if invitation is overdue
    const isInvitationOverdue = () => {
      if (speaker.status !== 'Invited' || !speaker.response_deadline) return false;
      const deadline = speaker.response_deadline.toDate ? speaker.response_deadline.toDate() : new Date(speaker.response_deadline);
      return deadline < new Date();
    };
    
    const getActionIcon = (type) => {
      switch(type) {
        case 'invitation_drafted': return <Mail size={20} />;
        case 'speaker_responded': return <CheckCircle size={20} />;
        case 'travel_arrangements': return <Plane size={20} />;
        default: return <CheckCircle size={20} />;
      }
    };
  
    const getActionTitle = (type) => {
      switch(type) {
        case 'invitation_drafted': return 'Invitation Email';
        case 'speaker_responded': return 'Speaker Response';
        case 'travel_arrangements': return 'Travel Arrangements';
        default: return 'Action';
      }
    };
  
    const getActionContent = (action) => {
      if (action.type === 'speaker_responded') {
        return (
          <div style={styles.actionCardContent}>
            <p style={{margin: '8px 0', color: action.action === 'accepted' ? '#27ae60' : '#e74c3c', fontWeight: '600'}}>
              Speaker {action.action === 'accepted' ? 'accepted' : 'declined'} the invitation
            </p>
          </div>
        );
      }
      
      if (action.type === 'travel_arrangements') {
        const seminarDate = speaker.assigned_date ? formatDate(speaker.assigned_date) : '[seminar date]';
        const travelEmailBody = `Dear ${speaker.full_name},
  
  I hope this email finds you well.
  We are delighted that you will be giving a seminar at the Barcelona Collaboratorium on ${seminarDate}.
  
  To start organizing your trip, could you please confirm your dates of stay in Barcelona? Once we have this information, we will send you an invitation to our TravelPerk platform, where you will book your flights and hotel. Please note that the TravelPerk invitation link expires in 24 hours, so it's best to complete the registration shortly after receiving it.
  
  Additionally, to announce your seminar internally and on our website, we would kindly ask you to send us a title and a brief abstract of your talk when convenient.
  
  We will schedule one-to-one meetings (30 minutes each) with you on Thursday after the seminar, for people who express interest.
  
  Don't hesitate to reach out if you have any questions regarding the logistics or your presentation.
  
  We look forward to welcoming you in Barcelona.
  
  Best regards,
  ${currentUser.full_name}`;
  
        return (
          <div style={styles.actionCardContent}>
            <p style={styles.emailLabel}>To: {speaker.email}</p>
            <p style={styles.emailLabel}>Subject: Travel Arrangements - Barcelona Collaboratorium Seminar</p>
            <div style={styles.emailBody}>
              {travelEmailBody.split('\n').map((line, i) => (
                <p key={i} style={{margin: '8px 0'}}>{line}</p>
              ))}
            </div>
            <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
              <button
                onClick={() => {
                  const mailtoLink = `mailto:${speaker.email}?subject=${encodeURIComponent('Travel Arrangements - Barcelona Collaboratorium Seminar')}&body=${encodeURIComponent(travelEmailBody)}`;
                  window.location.href = mailtoLink;
                }}
                style={styles.sendEmailBtn}
              >
                <Send size={16} style={{marginRight: '6px'}} />
                Open in Email Client
              </button>
              <button
                onClick={async () => {
                  try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      await navigator.clipboard.writeText(travelEmailBody);
                      alert('Message copied to clipboard!');
                    } else {
                      const textArea = document.createElement('textarea');
                      textArea.value = travelEmailBody;
                      textArea.style.position = 'fixed';
                      textArea.style.left = '-999999px';
                      document.body.appendChild(textArea);
                      textArea.select();
                      try {
                        document.execCommand('copy');
                        alert('Message copied to clipboard!');
                      } catch (err) {
                        alert('Failed to copy text. Please copy manually.');
                      }
                      document.body.removeChild(textArea);
                    }
                  } catch (err) {
                    console.error('Copy failed:', err);
                    alert('Failed to copy text. Please copy manually.');
                  }
                }}
                style={{...styles.sendEmailBtn, backgroundColor: '#9b59b6'}}
              >
                📋 Copy Text
              </button>
            </div>
          </div>
        );
      }
  
      return null;
    };
  
    return (
      <div style={styles.sidebar}>
        <div style={{
          padding: '20px',
          borderBottom: '2px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8f9fa',
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '20px',
            color: '#2c3e50',
            fontWeight: '600'
          }}>Actions - {speaker.full_name}</h3>
          <button 
            onClick={onClose} 
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#666',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={24} />
          </button>
        </div>

        <div style={styles.sidebarContent}>
          <div style={styles.sidebarSection}>
            <p style={styles.sidebarText}><strong>Status:</strong> {speaker.status}</p>
            <p style={styles.sidebarText}><strong>Email:</strong> {speaker.email}</p>
            <p style={styles.sidebarText}><strong>Host:</strong> {speaker.host}</p>
            {speaker.assigned_date && (
              <p style={styles.sidebarText}><strong>Date:</strong> {formatDate(speaker.assigned_date)}</p>
            )}
          </div>
  
          <div style={styles.sidebarSection}>
            <h4 style={styles.sidebarSectionTitle}>Actions</h4>
            
            {isInvitationOverdue() && (
              <div style={{...styles.actionCard, backgroundColor: '#fff3cd', borderLeft: '4px solid #ff9800'}}>
                <div 
                  style={{...styles.actionCardHeader, cursor: 'pointer'}}
                  onClick={() => toggleCard('overdue')}
                >
                  <div style={{...styles.actionCardTitle, color: '#ff9800'}}>
                    <Mail size={20} />
                    <span style={{marginLeft: '8px'}}>⚠️ No Response from Speaker</span>
                  </div>
                  <span style={{fontSize: '18px', color: '#ff9800'}}>
                    {isCardCollapsed('overdue') ? '▼' : '▲'}
                  </span>
                </div>
                {!isCardCollapsed('overdue') && (
                  <div style={styles.actionCardContent}>
                    <p style={{margin: '8px 0', fontSize: '13px', color: '#856404'}}>
                      The speaker has not responded to the initial invitation sent on {formatDate(speaker.invitation_sent_date)}.
                      The deadline was {formatDate(speaker.response_deadline)}.
                    </p>
                    <p style={{margin: '8px 0', fontSize: '13px', color: '#856404', fontWeight: '600'}}>
                      Consider resending the invitation or following up directly.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {actions.map((action, index) => {
              const cardId = `action-${index}`;
              const isCollapsed = isCardCollapsed(cardId);
              
              return (
                <div key={index} style={styles.actionCard}>
                  <div 
                    style={{...styles.actionCardHeader, cursor: 'pointer'}}
                    onClick={() => toggleCard(cardId)}
                  >
                    <div style={styles.actionCardTitle}>
                      {getActionIcon(action.type)}
                      <span style={{marginLeft: '8px'}}>{getActionTitle(action.type)}</span>
                    </div>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                      <input
                        type="checkbox"
                        checked={action.completed}
                        onChange={(e) => {
                          e.stopPropagation();
                          onUpdateAction(speaker.id, index, e.target.checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={styles.checkbox}
                      />
                      <span style={{fontSize: '18px', color: '#666'}}>
                        {isCollapsed ? '▼' : '▲'}
                      </span>
                    </div>
                  </div>
                  
                  {!isCollapsed && (
                    <>
                      {action.type === 'invitation_drafted' && (
                        <div style={styles.actionCardContent}>
                          <p style={styles.emailLabel}>To: {speaker.email}</p>
                          <p style={styles.emailLabel}>Subject: {emailSubject}</p>
                          <div style={styles.emailBody}>
                            {emailBody.split('\n').map((line, i) => (
                              <p key={i} style={{margin: '8px 0'}}>{line}</p>
                            ))}
                          </div>
                          <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                            <button
                              onClick={() => {
                                const mailtoLink = `mailto:${speaker.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
                                window.location.href = mailtoLink;
                              }}
                              style={styles.sendEmailBtn}
                            >
                              <Send size={16} style={{marginRight: '6px'}} />
                              Open in Email Client
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  if (navigator.clipboard && navigator.clipboard.writeText) {
                                    await navigator.clipboard.writeText(emailBody);
                                    alert('Message copied to clipboard!');
                                  } else {
                                    const textArea = document.createElement('textarea');
                                    textArea.value = emailBody;
                                    textArea.style.position = 'fixed';
                                    textArea.style.left = '-999999px';
                                    document.body.appendChild(textArea);
                                    textArea.select();
                                    try {
                                      document.execCommand('copy');
                                      alert('Message copied to clipboard!');
                                    } catch (err) {
                                      alert('Failed to copy text. Please copy manually.');
                                    }
                                    document.body.removeChild(textArea);
                                  }
                                } catch (err) {
                                  console.error('Copy failed:', err);
                                  alert('Failed to copy text. Please copy manually.');
                                }
                              }}
                              style={{...styles.sendEmailBtn, backgroundColor: '#9b59b6'}}
                            >
                              📋 Copy Text
                            </button>
                          </div>
                        </div>
                      )}
  
                      {getActionContent(action)}
                      
                      <p style={styles.actionTimestamp}>
                        {action.user} - {new Date(action.timestamp).toLocaleString()}
                      </p>
                      {action.completed && action.completedAt && (
                        <p style={styles.actionCompleted}>
                          ✓ Completed on {new Date(action.completedAt).toLocaleString()}
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
  
          {speaker.status === 'Accepted' && !actions.some(a => a.type === 'travel_arrangements') && (
            <button
              onClick={() => onAddAction(speaker.id, 'travel_arrangements')}
              style={styles.addActionBtn}
            >
              + Add Travel Arrangements Card
            </button>
          )}
        </div>
      </div>
    );
  }

/* ---------------------
   AgendaSidebar - Google Calendar style
   --------------------- */
   function AgendaSidebar({ 
    agenda, 
    onClose, 
    onAddMeeting, 
    onDeleteMeeting, 
    showAddMeetingForm,
    onSubmitMeeting,
    onCancelMeeting,
    selectedTimeSlot,
    onSelectTimeSlot,
    formatDate,
    currentUser
  }) {
    const [shareMenuOpen, setShareMenuOpen] = useState(false);
    
    // Get the three days (day before, talk day, day after)
    const seminarDate = agenda.seminar_date?.toDate ? agenda.seminar_date.toDate() : new Date(agenda.seminar_date);
    const startDate = agenda.start_date?.toDate ? agenda.start_date.toDate() : new Date(agenda.start_date);
    const endDate = agenda.end_date?.toDate ? agenda.end_date.toDate() : new Date(agenda.end_date);
    
    const days = [startDate, seminarDate, endDate];
    
    // Generate time slots from 8am to 8pm
    const timeSlots = [];
    for (let hour = 8; hour <= 20; hour++) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 20) timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    
    // Get meetings for a specific time slot
    const getMeetingsForSlot = (day, timeSlot) => {
      return (agenda.meetings || []).filter(meeting => {
        const meetingDate = meeting.date?.toDate ? meeting.date.toDate() : new Date(meeting.date);
        const meetingStart = meeting.start_time?.toDate ? meeting.start_time.toDate() : new Date(meeting.start_time);
        
        const slotHour = parseInt(timeSlot.split(':')[0]);
        const slotMinute = parseInt(timeSlot.split(':')[1]);
        
        // Check if meeting is on this day and overlaps with this time slot
        if (meetingDate.toDateString() === day.toDateString()) {
          const meetingHour = meetingStart.getHours();
          const meetingMinute = meetingStart.getMinutes();
          
          return meetingHour === slotHour && meetingMinute === slotMinute;
        }
        return false;
      });
    };
    
    const getMeetingColor = (type) => {
      switch(type) {
        case 'seminar': return '#d63447';
        case 'meeting': return '#3498db';
        case 'social': return '#27ae60';
        default: return '#9b59b6';
      }
    };
    
    const formatTimeSlot = (meeting) => {
      const start = meeting.start_time?.toDate ? meeting.start_time.toDate() : new Date(meeting.start_time);
      const end = meeting.end_time?.toDate ? meeting.end_time.toDate() : new Date(meeting.end_time);
      return `${start.getHours()}:${start.getMinutes().toString().padStart(2, '0')} - ${end.getHours()}:${end.getMinutes().toString().padStart(2, '0')}`;
    };
    
    const handleTimeSlotClick = (day, time) => {
      if (showAddMeetingForm) return;
      onSelectTimeSlot({ day, time });
      onAddMeeting();
    };
    
    // Generate iCal file for download
    const generateICalFile = () => {
      const icsLines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Collaboratorium Barcelona//Seminar//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:' + agenda.speaker_name + ' Visit',
        'X-WR-TIMEZONE:Europe/Madrid'
      ];
      
      (agenda.meetings || []).forEach(meeting => {
        const start = meeting.start_time?.toDate ? meeting.start_time.toDate() : new Date(meeting.start_time);
        const end = meeting.end_time?.toDate ? meeting.end_time.toDate() : new Date(meeting.end_time);
        
        const formatICalDate = (date) => {
          return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };
        
        icsLines.push('BEGIN:VEVENT');
        icsLines.push('UID:' + Math.random().toString(36).substring(7) + '@collaboratorium.barcelona');
        icsLines.push('DTSTAMP:' + formatICalDate(new Date()));
        icsLines.push('DTSTART:' + formatICalDate(start));
        icsLines.push('DTEND:' + formatICalDate(end));
        icsLines.push('SUMMARY:' + meeting.title);
        if (meeting.location) icsLines.push('LOCATION:' + meeting.location);
        if (meeting.notes) icsLines.push('DESCRIPTION:' + meeting.notes.replace(/\n/g, '\\n'));
        if (meeting.attendees && meeting.attendees.length > 0) {
          meeting.attendees.forEach(attendee => {
            icsLines.push('ATTENDEE:mailto:' + attendee);
          });
        }
        icsLines.push('END:VEVENT');
      });
      
      icsLines.push('END:VCALENDAR');
      
      const icsContent = icsLines.join('\r\n');
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${agenda.speaker_name.replace(/\s+/g, '_')}_Visit.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    
    return (
      <div style={styles.agendaSidebar}>
        <div style={{
          padding: '20px',
          borderBottom: '2px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8f9fa',
        }}>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '20px',
              color: '#2c3e50',
              fontWeight: '600'
            }}>Agenda - {agenda.speaker_name}</h3>
            <p style={{fontSize: '13px', color: '#666', margin: '4px 0 0 0'}}>
              {formatDate(seminarDate)}
            </p>
          </div>
          <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
            <div style={{position: 'relative'}}>
              <button 
                onClick={() => setShareMenuOpen(!shareMenuOpen)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Send size={16} />
                Share
              </button>
              
              {shareMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '5px',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  zIndex: 100,
                  minWidth: '200px'
                }}>
                  <button
                    onClick={() => {
                      generateICalFile();
                      setShareMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 15px',
                      textAlign: 'left',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: '13px',
                      borderBottom: '1px solid #eee'
                    }}
                  >
                    📥 Download .ics file
                  </button>
                  <button
                    onClick={() => {
                      const email = prompt('Enter speaker email to send calendar:');
                      if (email) {
                        const subject = `Calendar for your visit to Barcelona`;
                        const body = `Please find attached your visit calendar. You can import the attached .ics file into your calendar application (Google Calendar, Outlook, etc.).\n\nLooking forward to your visit!\n\nBest regards,\n${currentUser.full_name}`;
                        window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                      }
                      setShareMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 15px',
                      textAlign: 'left',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    📧 Email to speaker
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={onClose} 
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#666',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={24} />
            </button>
          </div>
        </div>
  
        <div style={styles.calendarContainer}>
          {/* Day headers */}
          <div style={styles.calendarDaysHeader}>
            <div style={styles.calendarTimeColumn}></div>
            {days.map((day, idx) => (
              <div key={idx} style={styles.calendarDayHeader}>
                <div style={styles.agendaCalendarDayName}>
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div style={styles.calendarDayDate}>
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>
  
          {/* Time slots grid */}
          <div style={styles.agendaCalendarGrid}>
            {timeSlots.map((timeSlot, timeIdx) => (
              <React.Fragment key={timeIdx}>
                {/* Time label */}
                <div style={styles.timeSlotLabel}>{timeSlot}</div>
                
                {/* Day cells */}
                {days.map((day, dayIdx) => {
                  const meetings = getMeetingsForSlot(day, timeSlot);
                  const isClickable = currentUser.role === 'Organizer' || agenda.host === currentUser.full_name;
                  
                  return (
                    <div
                      key={dayIdx}
                      style={{
                        ...styles.timeSlotCell,
                        backgroundColor: isClickable ? 'transparent' : '#f9f9f9',
                        cursor: isClickable ? 'pointer' : 'default'
                      }}
                      onMouseEnter={(e) => {
                        if (isClickable && meetings.length === 0) {
                          e.currentTarget.style.backgroundColor = '#e3f2fd';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isClickable) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                      onClick={() => isClickable && meetings.length === 0 && handleTimeSlotClick(day, timeSlot)}
                    >
                      {meetings.map((meeting, meetingIdx) => (
                        <div
                          key={meetingIdx}
                          style={{
                            ...styles.calendarMeeting,
                            backgroundColor: getMeetingColor(meeting.type)
                          }}
                        >
                          <div style={styles.calendarMeetingTitle}>
                            {meeting.title}
                          </div>
                          <div style={styles.calendarMeetingTime}>
                            {formatTimeSlot(meeting)}
                          </div>
                          {meeting.location && (
                            <div style={{fontSize: '10px', marginTop: '2px'}}>
                              📍 {meeting.location}
                            </div>
                          )}
                          {!meeting.is_locked && isClickable && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const meetingIndex = agenda.meetings.findIndex(m => m === meeting);
                                onDeleteMeeting(meetingIndex);
                              }}
                              style={styles.deleteMeetingBtn}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
  
        {/* Agenda info footer */}
        <div style={styles.agendaInfo}>
          <div style={{fontSize: '13px', color: '#666'}}>
            <strong>Host:</strong> {agenda.host} | <strong>Speaker:</strong> {agenda.speaker_email}
          </div>
          {(currentUser.role === 'Organizer' || agenda.host === currentUser.full_name) && (
            <button
              onClick={onAddMeeting}
              style={{
                marginTop: '10px',
                padding: '8px 12px',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                width: '100%'
              }}
            >
              + Add Meeting
            </button>
          )}
        </div>
  
        {/* Add meeting form overlay */}
        {showAddMeetingForm && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '8px',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}>
              <AddMeetingFormInline
                onSubmit={onSubmitMeeting}
                onCancel={onCancelMeeting}
                selectedTimeSlot={selectedTimeSlot}
                seminarDate={seminarDate}
              />
            </div>
          </div>
        )}
      </div>
    );
  }
  
  /* ---------------------
     AddMeetingFormInline - used within AgendaSidebar
     --------------------- */
  function AddMeetingFormInline({ onSubmit, onCancel, selectedTimeSlot, seminarDate }) {
    const initialDate = selectedTimeSlot?.day 
      ? selectedTimeSlot.day.toISOString().split('T')[0]
      : seminarDate.toISOString().split('T')[0];
      
    const initialStartTime = selectedTimeSlot?.time || '10:00';
    
    // Calculate end time (30 minutes after start)
    const calculateEndTime = (startTime) => {
      const [hours, minutes] = startTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + 30;
      const endHours = Math.floor(totalMinutes / 60);
      const endMinutes = totalMinutes % 60;
      return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    };
    
    const [form, setForm] = useState({ 
      title: '', 
      type: 'meeting', 
      date: initialDate, 
      start_time: initialStartTime, 
      end_time: calculateEndTime(initialStartTime), 
      location: '', 
      attendees: '', 
      notes: '' 
    });
    
    const submit = (e) => { 
      e.preventDefault(); 
      onSubmit(form); 
    };
    
    return (
      <form onSubmit={submit} className="space-y-3">
        <h3 style={{fontSize: '20px', fontWeight: '600', marginBottom: '15px'}}>Add Meeting</h3>
        
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input 
            className="w-full border rounded px-3 py-2" 
            placeholder="Meeting title" 
            value={form.title} 
            onChange={e => setForm({ ...form, title: e.target.value })} 
            required 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select 
            className="w-full border rounded px-3 py-2" 
            value={form.type} 
            onChange={e => setForm({ ...form, type: e.target.value })}
          >
            <option value="meeting">Meeting</option>
            <option value="social">Social</option>
            <option value="seminar">Seminar</option>
          </select>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-sm font-medium mb-1">Date *</label>
            <input 
              type="date" 
              className="w-full border rounded px-3 py-2" 
              value={form.date} 
              onChange={e => setForm({ ...form, date: e.target.value })} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start *</label>
            <input 
              type="time" 
              className="w-full border rounded px-3 py-2" 
              value={form.start_time} 
              onChange={e => {
                const newStartTime = e.target.value;
                setForm({ 
                  ...form, 
                  start_time: newStartTime,
                  end_time: calculateEndTime(newStartTime)
                });
              }} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End *</label>
            <input 
              type="time" 
              className="w-full border rounded px-3 py-2" 
              value={form.end_time} 
              onChange={e => setForm({ ...form, end_time: e.target.value })} 
              required 
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input 
            className="w-full border rounded px-3 py-2" 
            placeholder="Meeting location" 
            value={form.location} 
            onChange={e => setForm({ ...form, location: e.target.value })} 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Attendees (comma-separated emails)</label>
          <input 
            className="w-full border rounded px-3 py-2" 
            placeholder="email1@example.com, email2@example.com" 
            value={form.attendees} 
            onChange={e => setForm({ ...form, attendees: e.target.value })} 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea 
            className="w-full border rounded px-3 py-2" 
            placeholder="Additional notes" 
            value={form.notes} 
            onChange={e => setForm({ ...form, notes: e.target.value })} 
            rows={3}
          />
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onCancel} className="px-4 py-2 border rounded">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-primary text-white rounded">Save Meeting</button>
        </div>
      </form>
    );
  }

/* ---------------------
   PosterSidebar (simplified)
   --------------------- */
function PosterSidebar({ speaker, onClose, formatDate, allUsers }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium">Poster - {speaker.full_name}</h3>
        <button onClick={onClose} className="text-neutral-500"><X /></button>
      </div>

      <div className="space-y-4">
        <div>
          <div className="font-semibold">Title</div>
          <div className="text-sm text-neutral-600">{speaker.talk_title || '(TBC)'}</div>
        </div>
        <div>
          <div className="font-semibold">Date</div>
          <div className="text-sm text-neutral-600">{formatDate(speaker.assigned_date)}</div>
        </div>
        <div>
          <button className="px-3 py-2 bg-primary text-white rounded">Download Poster (PDF)</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------
   AddDateForm
   --------------------- */
function AddDateForm({ onSubmit, onCancel, existingDates, formatDate }) {
  const [form, setForm] = useState({ date: '', host: '', notes: '' });
  const handle = (e) => { e.preventDefault(); onSubmit(form); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow p-6 w-full max-w-2xl">
        <h3 className="text-xl font-semibold mb-4">Add Available Date</h3>
        <form onSubmit={handle} className="space-y-4">
          <div>
            <label className="text-sm block mb-1">Date *</label>
            <input type="date" className="w-full border rounded px-3 py-2" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div>
            <label className="text-sm block mb-1">Host</label>
            <input className="w-full border rounded px-3 py-2" value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Notes</label>
            <input className="w-full border rounded px-3 py-2" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onCancel} type="button" className="px-3 py-2 border rounded">Cancel</button>
            <button type="submit" className="px-3 py-2 bg-primary text-white rounded">Add Date</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------------
   AddSpeakerForm
   --------------------- */
function AddSpeakerForm({ onSubmit, onCancel, seniorFellows, currentUser, countries }) {
  const [form, setForm] = useState({ full_name: '', email: '', affiliation: '', country: '', area_of_expertise: '', ranking: 'Medium Priority', notes: '', host: currentUser?.full_name || '' });
  const submit = (e) => { e.preventDefault(); onSubmit(form); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow p-6 w-full max-w-2xl">
        <h3 className="text-xl font-semibold mb-4">Propose Speaker</h3>
        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm block mb-1">Full Name *</label>
            <input required className="w-full border rounded px-3 py-2" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Email *</label>
            <input required type="email" className="w-full border rounded px-3 py-2" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Affiliation *</label>
            <input required className="w-full border rounded px-3 py-2" value={form.affiliation} onChange={e => setForm({ ...form, affiliation: e.target.value })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Country *</label>
            <select required className="w-full border rounded px-3 py-2" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}>
              <option value="">-- Select Country --</option>
              {countries.map((c, idx) => c.startsWith('---') ? <option key={idx} disabled>{c}</option> : <option key={idx}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm block mb-1">Area of Expertise *</label>
            <input required className="w-full border rounded px-3 py-2" value={form.area_of_expertise} onChange={e => setForm({ ...form, area_of_expertise: e.target.value })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Priority</label>
            <select className="w-full border rounded px-3 py-2" value={form.ranking} onChange={e => setForm({ ...form, ranking: e.target.value })}>
              <option>High Priority</option>
              <option>Medium Priority</option>
              <option>Low Priority</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-sm block mb-1">Notes *</label>
            <input className="w-full border rounded px-3 py-2" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value})} placeholder="Optional notes about why this speaker should be invited" />
          </div>
          <div>
            <label className="text-sm block mb-1">Host *</label>
            <select required className="w-full border rounded px-3 py-2" value={form.host} onChange={e => setForm({ ...form, host: e.target.value })}>
              <option value="">-- Select Host --</option>
              {seniorFellows.map(f => <option key={f.id} value={f.full_name}>{f.full_name} ({f.role})</option>)}
            </select>
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="px-3 py-2 border rounded">Cancel</button>
            <button type="submit" className="px-3 py-2 bg-primary text-white rounded">Propose Speaker</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------------
   AddPastSpeakerForm
   --------------------- */
function AddPastSpeakerForm({ onSubmit, onCancel, seniorFellows, countries }) {
  const [form, setForm] = useState({ full_name: '', email: '', affiliation: '', country: '', area_of_expertise: '', host: '', assigned_date: '', talk_title: '', talk_abstract: '' });
  const submit = (e) => { e.preventDefault(); onSubmit(form); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow p-6 w-full max-w-2xl">
        <h3 className="text-xl font-semibold mb-4">Add Past Speaker</h3>
        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
          <input className="col-span-2 border rounded px-3 py-2" placeholder="Full name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
          <input className="border rounded px-3 py-2" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Affiliation" value={form.affiliation} onChange={e => setForm({ ...form, affiliation: e.target.value })} required />
          <select className="border rounded px-3 py-2" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} required>
            <option value="">-- Country --</option>
            {countries.map((c, idx) => c.startsWith('---') ? <option key={idx} disabled>{c}</option> : <option key={idx}>{c}</option>)}
          </select>
          <input className="border rounded px-3 py-2" placeholder="Area of expertise" value={form.area_of_expertise} onChange={e => setForm({ ...form, area_of_expertise: e.target.value })} required />
          <select className="border rounded px-3 py-2" value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} required>
            <option value="">-- Host --</option>
            {seniorFellows.map(f => <option key={f.id} value={f.full_name}>{f.full_name} ({f.role})</option>)}
          </select>
          <input type="date" className="border rounded px-3 py-2" value={form.assigned_date} onChange={e => setForm({ ...form, assigned_date: e.target.value })} required />
          <input className="border rounded px-3 py-2" placeholder="Talk title" value={form.talk_title} onChange={e => setForm({ ...form, talk_title: e.target.value })} />
          <textarea className="col-span-2 border rounded px-3 py-2" placeholder="Talk abstract" value={form.talk_abstract} onChange={e => setForm({ ...form, talk_abstract: e.target.value })} />
          <div className="col-span-2 flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="px-3 py-2 border rounded">Cancel</button>
            <button type="submit" className="px-3 py-2 bg-primary text-white rounded">Add Past Speaker</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------------
   EditSpeakerForm
   --------------------- */
function EditSpeakerForm({ speaker, onSubmit, onCancel, seniorFellows, countries }) {
  const [form, setForm] = useState({
    full_name: speaker.full_name || '',
    email: speaker.email || '',
    affiliation: speaker.affiliation || '',
    country: speaker.country || '',
    area_of_expertise: speaker.area_of_expertise || '',
    ranking: speaker.ranking || 'Medium Priority',
    host: speaker.host || ''
  });
  const submit = (e) => { e.preventDefault(); onSubmit(form); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow p-6 w-full max-w-2xl">
        <h3 className="text-xl font-semibold mb-4">Edit Speaker</h3>
        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
          <input className="col-span-2 border rounded px-3 py-2" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
          <input className="border rounded px-3 py-2" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          <input className="border rounded px-3 py-2" value={form.affiliation} onChange={e => setForm({ ...form, affiliation: e.target.value })} required />
          <select className="border rounded px-3 py-2" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} required>
            <option value="">-- Country --</option>
            {countries.map((c, idx) => c.startsWith('---') ? <option key={idx} disabled>{c}</option> : <option key={idx}>{c}</option>)}
          </select>
          <input className="border rounded px-3 py-2" value={form.area_of_expertise} onChange={e => setForm({ ...form, area_of_expertise: e.target.value })} required />
          <select className="border rounded px-3 py-2" value={form.ranking} onChange={e => setForm({ ...form, ranking: e.target.value })}>
            <option>High Priority</option>
            <option>Medium Priority</option>
            <option>Low Priority</option>
          </select>
          <select className="border rounded px-3 py-2" value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} required>
            <option value="">-- Host --</option>
            {seniorFellows.map(f => <option key={f.id} value={f.full_name}>{f.full_name} ({f.role})</option>)}
          </select>
          <div className="col-span-2 flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="px-3 py-2 border rounded">Cancel</button>
            <button type="submit" className="px-3 py-2 bg-primary text-white rounded">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------------
   EditConfirmedSpeakerForm
   --------------------- */
function EditConfirmedSpeakerForm({ speaker, availableDates, onSubmit, onDelete, onCancel, formatDate }) {
  const currentLockedDate = availableDates.find(d => d.locked_by_id === speaker.id);
  const [form, setForm] = useState({
    talk_title: speaker.talk_title || '',
    talk_abstract: speaker.talk_abstract || '',
    host: speaker.host || '',
    assigned_date: speaker.assigned_date ? (speaker.assigned_date.toDate ? speaker.assigned_date.toDate().toISOString().split('T')[0] : new Date(speaker.assigned_date).toISOString().split('T')[0]) : '',
    current_date_id: currentLockedDate?.id || null,
    new_date_id: currentLockedDate?.id || null,
    old_date_id: currentLockedDate?.id || null
  });

  const submit = (e) => { e.preventDefault(); onSubmit(form); };

  const selectableDates = availableDates.filter(d => (d.available || d.id === currentLockedDate?.id) && d.locked_by_id !== 'DELETED');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow p-6 w-full max-w-2xl">
        <h3 className="text-xl font-semibold mb-4">Edit Confirmed Speaker</h3>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm block mb-1">Talk Title</label>
            <input className="w-full border rounded px-3 py-2" value={form.talk_title} onChange={e => setForm({ ...form, talk_title: e.target.value })} required />
          </div>
          <div>
            <label className="text-sm block mb-1">Talk Abstract</label>
            <textarea className="w-full border rounded px-3 py-2 min-h-[120px]" value={form.talk_abstract} onChange={e => setForm({ ...form, talk_abstract: e.target.value })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Host</label>
            <input className="w-full border rounded px-3 py-2" value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} required />
          </div>
          <div>
            <label className="text-sm block mb-1">Assigned Date</label>
            <select className="w-full border rounded px-3 py-2" value={form.new_date_id || ''} onChange={(e) => {
              const selectedDateId = e.target.value;
              const selectedDate = availableDates.find(d => d.id === selectedDateId);
              setForm({
                ...form,
                new_date_id: selectedDateId,
                assigned_date: selectedDate?.date ? (selectedDate.date.toDate ? selectedDate.date.toDate().toISOString().split('T')[0] : new Date(selectedDate.date).toISOString().split('T')[0]) : ''
              });
            }} required>
              <option value="">-- Select Date --</option>
              {selectableDates.map(d => <option key={d.id} value={d.id}>{formatDate(d.date)} - {d.host} {d.notes ? `(${d.notes})` : ''}{d.id === currentLockedDate?.id ? ' (Current)' : ''}</option>)}
            </select>
          </div>

          <div className="flex justify-between gap-2">
            <button type="button" onClick={onCancel} className="px-3 py-2 border rounded">Cancel</button>
            <div className="flex gap-2">
              <button type="submit" className="px-3 py-2 bg-primary text-white rounded">Save Changes</button>
              <button type="button" onClick={() => onDelete(speaker.id)} className="px-3 py-2 bg-red-600 text-white rounded">Delete Speaker</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------------
   InviteUserForm
   --------------------- */
function InviteUserForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({ email: '', full_name: '', affiliation: '', role: 'Senior Fellow' });
  const submit = (e) => { e.preventDefault(); onSubmit(form); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow p-6 w-full max-w-lg">
        <h3 className="text-xl font-semibold mb-4">Create User Invitation</h3>
        <form onSubmit={submit} className="space-y-3">
          <input required className="w-full border rounded px-3 py-2" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <input required className="w-full border rounded px-3 py-2" placeholder="Full name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
          <input required className="w-full border rounded px-3 py-2" placeholder="Affiliation" value={form.affiliation} onChange={e => setForm({ ...form, affiliation: e.target.value })} />
          <select className="w-full border rounded px-3 py-2" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            <option>Senior Fellow</option>
            <option>Fellow</option>
            <option>Organizer</option>
          </select>
          <div className="flex justify-end gap-2">
            <button onClick={onCancel} type="button" className="px-3 py-2 border rounded">Cancel</button>
            <button type="submit" className="px-3 py-2 bg-primary text-white rounded">Create Invitation</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------------
   EditUserForm
   --------------------- */
function EditUserForm({ user, onSubmit, onCancel }) {
  const [form, setForm] = useState({ full_name: user.full_name, affiliation: user.affiliation || '', role: user.role });
  const submit = (e) => { e.preventDefault(); onSubmit(form); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4">Edit User</h3>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-sm block mb-1">Email</label>
            <input className="w-full border rounded px-3 py-2 bg-neutral-100" value={user.email} disabled />
          </div>
          <div>
            <label className="text-sm block mb-1">Full name</label>
            <input className="w-full border rounded px-3 py-2" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
          </div>
          <div>
            <label className="text-sm block mb-1">Affiliation</label>
            <input className="w-full border rounded px-3 py-2" value={form.affiliation} onChange={e => setForm({ ...form, affiliation: e.target.value })} required />
          </div>
          <div>
            <label className="text-sm block mb-1">Role</label>
            <select className="w-full border rounded px-3 py-2" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option>Senior Fellow</option>
              <option>Fellow</option>
              <option>Organizer</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onCancel} type="button" className="px-3 py-2 border rounded">Cancel</button>
            <button type="submit" className="px-3 py-2 bg-primary text-white rounded">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------------
   EditProfileForm
   --------------------- */
function EditProfileForm({ userRole, onSubmit, onCancel }) {
  const [form, setForm] = useState({ full_name: userRole.full_name, affiliation: userRole.affiliation || '' });
  const submit = (e) => { e.preventDefault(); onSubmit(form); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4">Edit My Profile</h3>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-sm block mb-1">Email</label>
            <input className="w-full border rounded px-3 py-2 bg-neutral-100" value={userRole.email} disabled />
          </div>
          <div>
            <label className="text-sm block mb-1">Full name</label>
            <input className="w-full border rounded px-3 py-2" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
          </div>
          <div>
            <label className="text-sm block mb-1">Affiliation</label>
            <input className="w-full border rounded px-3 py-2" value={form.affiliation} onChange={e => setForm({ ...form, affiliation: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onCancel} type="button" className="px-3 py-2 border rounded">Cancel</button>
            <button type="submit" className="px-3 py-2 bg-primary text-white rounded">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontSize: '24px',
    color: '#666',
  },
  header: {
    backgroundColor: '#2c3e50',
    color: 'white',
    padding: '20px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '24px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  userName: {
    fontSize: '14px',
  },
  logoutBtn: {
    padding: '8px 16px',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  nav: {
    backgroundColor: '#34495e',
    padding: '0',
    display: 'flex',
    gap: '0',
  },
  navBtn: {
    padding: '15px 25px',
    backgroundColor: 'transparent',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    borderBottom: '3px solid transparent',
    transition: 'all 0.3s',
  },
  navBtnActive: {
    backgroundColor: '#2c3e50',
    borderBottom: '3px solid #3498db',
  },
  mainContent: {
    display: 'flex',
    minHeight: 'calc(100vh - 120px)',
  },
  content: {
    flex: 1,
    padding: '30px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  sidebar: {
    width: '400px',
    backgroundColor: 'white',
    borderLeft: '1px solid #ddd',
    boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 120px)',
    position: 'sticky',
    top: '120px',
  },
  sidebarHeader: {
    padding: '20px',
    borderBottom: '2px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  sidebarTitle: {
    margin: 0,
    fontSize: '18px',
    color: '#2c3e50',
  },
  sidebarCloseBtn: {
    position: 'absolute',
    right: '20px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#666',
    padding: '4px',
  },
  sidebarContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
  },
  sidebarSection: {
    marginBottom: '25px',
  },
  sidebarText: {
    margin: '8px 0',
    fontSize: '14px',
    color: '#555',
  },
  sidebarSectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '15px',
    paddingBottom: '8px',
    borderBottom: '2px solid #e0e0e0',
  },
  actionCard: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '15px',
  },
  actionCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  actionCardTitle: {
    display: 'flex',
    alignItems: 'center',
    fontWeight: '600',
    color: '#2c3e50',
    fontSize: '15px',
  },
  actionCardContent: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #e0e0e0',
  },
  emailLabel: {
    fontSize: '13px',
    color: '#666',
    margin: '4px 0',
  },
  emailBody: {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    fontSize: '13px',
    lineHeight: '1.6',
    color: '#555',
    maxHeight: '200px',
    overflowY: 'auto',
  },
  sendEmailBtn: {
    marginTop: '10px',
    padding: '8px 12px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTimestamp: {
    fontSize: '12px',
    color: '#999',
    marginTop: '8px',
  },
  actionCompleted: {
    fontSize: '12px',
    color: '#27ae60',
    marginTop: '4px',
    fontWeight: '600',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
  },
  addActionBtn: {
    padding: '10px',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    width: '100%',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '28px',
    color: '#2c3e50',
    margin: '0 0 20px 0',
  },
  subsectionTitle: {
    fontSize: '20px',
    color: '#34495e',
    margin: '0 0 15px 0',
  },
  section: {
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '8px',
    marginBottom: '25px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    border: '2px solid #00BCD4',
  },
  statNumber: {
    fontSize: '42px',
    fontWeight: '700',
    color: '#00BCD4',
  },
  statLabel: {
    fontSize: '16px',
    color: '#666',
    marginTop: '8px',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '25px',
    marginBottom: '30px',
  },
  chartBox: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  },
  chartTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '15px',
    textAlign: 'center',
  },
  yearSection: {
    marginBottom: '30px',
  },
  yearTitle: {
    fontSize: '22px',
    color: '#00BCD4',
    marginBottom: '15px',
    paddingBottom: '10px',
    borderBottom: '2px solid #00BCD4',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    borderBottom: '2px solid #ddd',
    backgroundColor: '#f8f9fa',
    fontWeight: '600',
    color: '#2c3e50',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #eee',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
  },
  addBtn: {
    padding: '10px 20px',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  actionBtn: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    marginRight: '5px',
    color: 'white',
  },
  acceptBtn: {
    backgroundColor: '#27ae60',
  },
  declineBtn: {
    backgroundColor: '#e74c3c',
  },
  emptyText: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '20px',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    minWidth: '500px',
    maxWidth: '700px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalTitle: {
    margin: '0 0 20px 0',
    fontSize: '22px',
    color: '#2c3e50',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  label: {
    marginTop: '15px',
    marginBottom: '5px',
    fontWeight: '600',
    color: '#2c3e50',
  },
  labelLarge: {
    marginTop: '20px',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#2c3e50',
    fontSize: '16px',
  },
  input: {
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    width: '100%',
    boxSizing: 'border-box',
  },
  select: {
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    width: '100%',
    boxSizing: 'border-box',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '25px',
  },
  submitBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#95a5a6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  loginContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#2c3e50',
  },
  loginBox: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    minWidth: '400px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
  },
  loginTitle: {
    margin: '0 0 30px 0',
    fontSize: '24px',
    color: '#2c3e50',
    textAlign: 'center',
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  signupWelcome: {
    fontSize: '16px',
    color: '#2c3e50',
    marginBottom: '10px',
    textAlign: 'center',
  },
  signupInfo: {
    fontSize: '14px',
    color: '#555',
    marginBottom: '20px',
    textAlign: 'center',
    lineHeight: '1.6',
  },
  speakerContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  speakerBox: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  },
  speakerTitle: {
    margin: '0 0 20px 0',
    fontSize: '26px',
    color: '#2c3e50',
  },
  speakerText: {
    marginBottom: '15px',
    fontSize: '16px',
    color: '#34495e',
    lineHeight: '1.6',
  },
  speakerForm: {
    marginTop: '30px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  calendar: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '15px',
    backgroundColor: '#fff',
    width: '100%',
    boxSizing: 'border-box',
  },
  calendarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  calendarNavBtn: {
    padding: '8px 12px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  calendarMonth: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#2c3e50',
  },
  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '8px',
  },
  calendarDayName: {
    textAlign: 'center',
    fontWeight: '600',
    padding: '8px',
    fontSize: '13px',
    color: '#666',
  },
  calendarDay: {
    padding: '12px',
    textAlign: 'center',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: '#f9f9f9',
    color: '#999',
  },
  calendarDayAvailable: {
    backgroundColor: '#d4edda',
    border: '2px solid #28a745',
    color: '#155724',
    fontWeight: '600',
  },
  calendarDaySelected: {
    backgroundColor: '#007bff',
    border: '2px solid #0056b3',
    color: 'white',
    fontWeight: '700',
  },
  calendarDayEmpty: {
    padding: '12px',
  },
  selectedDateInfo: {
    marginTop: '15px',
    padding: '12px',
    backgroundColor: '#e7f3ff',
    border: '1px solid #3498db',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#2c3e50',
  },
  existingDatesContainer: {
    marginBottom: '25px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  existingDatesTitle: {
    margin: '0 0 10px 0',
    fontSize: '16px',
    color: '#2c3e50',
    fontWeight: '600',
  },
  existingDatesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  existingDateItem: {
    padding: '10px 12px',
    borderRadius: '4px',
    fontSize: '13px',
  },
  existingDateInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  existingDateStatus: {
    fontSize: '12px',
    fontWeight: '600',
  },
  existingDateDetails: {
    fontSize: '12px',
    color: '#555',
  },
  abstractPreview: {
    fontSize: '13px',
    color: '#555',
    cursor: 'help',
  },

  dashboardContainer: {
    display: 'flex',
    gap: '20px',
  },
  dashboardMain: {
    flex: 1,
  },
  notificationPanel: {
    width: '350px',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    alignSelf: 'flex-start',
    position: 'sticky',
    top: '30px',
    maxHeight: 'calc(100vh - 180px)',
    overflowY: 'auto',
  },
  notificationTitle: {
    margin: '0 0 15px 0',
    fontSize: '18px',
    color: '#2c3e50',
    fontWeight: '600',
    borderBottom: '2px solid #e0e0e0',
    paddingBottom: '10px',
  },
  notificationItem: {
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    position: 'relative',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '14px',
    flexWrap: 'wrap',
  },
  notificationBadge: {
    marginLeft: '8px',
    padding: '2px 8px',
    backgroundColor: '#3498db',
    color: 'white',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600',
  },
  notificationDetails: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '5px',
  },
  notificationDismiss: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#999',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: '1',
    marginLeft: '8px',
  },

  agendaSidebar: {
    width: '100%',  // Changed from fixed width
    height: '100%', // Changed to fill modal
    backgroundColor: 'white',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  calendarContainer: {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: '#fff',
  },
  calendarDaysHeader: {
    display: 'grid',
    gridTemplateColumns: '60px repeat(3, 1fr)',
    borderBottom: '2px solid #e0e0e0',
    position: 'sticky',
    top: 0,
    backgroundColor: '#fff',
    zIndex: 10,
  },
  calendarTimeColumn: {
    borderRight: '1px solid #e0e0e0',
  },
  calendarDayHeader: {
    padding: '12px 8px',
    textAlign: 'center',
    borderRight: '1px solid #e0e0e0',
  },
  agendaCalendarDayName: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  calendarDayDate: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: '4px',
  },
  agendaCalendarGrid: {
    display: 'grid',
    gridTemplateColumns: '60px repeat(3, 1fr)',
  },
  timeSlotLabel: {
    padding: '8px',
    fontSize: '12px',
    color: '#666',
    borderRight: '1px solid #e0e0e0',
    borderBottom: '1px solid #e0e0e0',
    textAlign: 'right',
    backgroundColor: '#f8f9fa',
  },
  timeSlotCell: {
    minHeight: '60px',
    borderRight: '1px solid #e0e0e0',
    borderBottom: '1px solid #e0e0e0',
    cursor: 'pointer',
    position: 'relative',
    padding: '4px',
    transition: 'background-color 0.2s',
  },
  calendarMeeting: {
    padding: '6px 8px',
    borderRadius: '4px',
    color: 'white',
    fontSize: '12px',
    marginBottom: '4px',
    position: 'relative',
    cursor: 'default',
  },
  calendarMeetingTitle: {
    fontWeight: '600',
    marginBottom: '2px',
  },
  calendarMeetingTime: {
    fontSize: '11px',
    opacity: 0.9,
  },
  deleteMeetingBtn: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    background: 'rgba(0,0,0,0.3)',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    cursor: 'pointer',
    fontSize: '16px',
    lineHeight: '1',
    padding: 0,
  },
  agendaInfo: {
    padding: '15px 20px',
    borderTop: '1px solid #e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  addMeetingFormContainer: {
    padding: '20px',
  },
  formTitle: {
    margin: '0 0 20px 0',
    fontSize: '18px',
    color: '#2c3e50',
  },
  formSectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '15px',
    paddingBottom: '8px',
    borderBottom: '2px solid #e0e0e0',
  },
  posterSidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  posterSidebarContent: {
    backgroundColor: 'white',
    width: '95%',
    maxWidth: '1600px',
    height: '90vh',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  posterSidebarHeader: {
    padding: '20px 30px',
    borderBottom: '2px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    position: 'relative',
  },
  posterSidebarTitle: {
    margin: 0,
    fontSize: '24px',
    color: '#2c3e50',
    fontWeight: '600',
  },
  posterFormAndPreview: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  posterForm: {
    flex: '0 0 350px',
    padding: '20px',
    borderRight: '2px solid #e0e0e0',
    overflowY: 'auto',
    backgroundColor: '#f8f9fa',
  },
  posterPreviewContainer: {
    flex: 1,
    padding: '20px',
    overflowY: 'auto',
    backgroundColor: '#e8e8e8',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  posterPreview: {
    width: '1123px',  // A4 landscape width at 150 DPI
    height: '794px',  // A4 landscape height at 150 DPI
    backgroundColor: '#0d1b4d',
    margin: '0 auto',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    backgroundImage: 'linear-gradient(135deg, #0a1133 0%, #1a3a6e 25%, #2d5aa0 50%, #1a3a6e 75%, #0a1133 100%)',
  },
  posterHeader: {
    backgroundColor: 'white',
    padding: '20px 30px',
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  posterLogosTop: {
    display: 'flex',
    gap: '30px',
    alignItems: 'center',
  },
  posterLogoItem: {
    display: 'flex',
    alignItems: 'center',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#2c3e50',
    padding: '8px 16px',
    border: '3px solid #2c3e50',
    borderRadius: '6px',
  },
  posterTitleBanner: {
    backgroundColor: '#00bcd4',
    padding: '25px 30px',
    textAlign: 'left',
  },
  posterBannerText: {
    fontSize: '42px',
    fontWeight: '700',
    color: 'white',
    lineHeight: '1.2',
    letterSpacing: '1px',
  },
  posterContentGrid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '1fr 1.2fr',
    gap: '40px',
    padding: '40px',
    color: 'white',
  },
  posterLeftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
  },
  posterRightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
  },
  posterInfoBlock: {
    marginBottom: '5px',
  },
  posterLabelPink: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#ff1493',
    marginBottom: '10px',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  posterContentText: {
    fontSize: '16px',
    color: 'white',
    lineHeight: '1.5',
  },
  posterSpeakerNameLarge: {
    fontSize: '24px',
    fontWeight: '700',
    color: 'white',
    marginBottom: '8px',
    lineHeight: '1.3',
  },
  posterAffiliationSmall: {
    fontSize: '15px',
    color: '#b0e0e6',
    fontStyle: 'italic',
    marginTop: '5px',
  },
  posterTitleItalic: {
    fontSize: '20px',
    fontWeight: '600',
    color: 'white',
    fontStyle: 'italic',
    lineHeight: '1.4',
  },
  posterQRCode: {
    width: '120px',
    height: '120px',
    border: '3px solid white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    color: 'white',
    marginTop: '15px',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  posterFooter: {
    backgroundColor: 'white',
    padding: '20px 30px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  posterFooterSupported: {
    fontSize: '14px',
    color: '#666',
    fontWeight: '600',
  },
  posterFooterLogos: {
    display: 'flex',
    gap: '15px',
    flex: 1,
  },
  footerLogoText: {
    fontSize: '11px',
    color: '#666',
    textAlign: 'center',
    flex: 1,
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#f8f9fa',
  },
};
/* ============================================================
   End of file
   ============================================================ */
