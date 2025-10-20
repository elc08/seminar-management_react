// src/App.jsx
import React, { useState, useEffect, useCallback, useMemo} from 'react';
import { getData as getCountryData, getCode } from 'country-list';
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

  const [editingMeeting, setEditingMeeting] = useState(null);
  const [editingMeetingIndex, setEditingMeetingIndex] = useState(null);
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
      if (speaker.lunch_reservation_booked) return false; // Skip if reservation is booked
      
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

  const handleMarkLunchReservationBooked = async (speakerId) => {
    try {
      await updateDoc(doc(db, 'speakers', speakerId), {
        lunch_reservation_booked: true
      });
      await loadSpeakers();
    } catch (err) {
      alert('Error updating reservation status: ' + (err.message || err));
    }
  };

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
      date: Timestamp.fromDate(newDate),
      available: formData.type === 'available',
      is_conflicting: formData.type === 'conflicting',
      locked_by_id: null,
      host: formData.host || '',
      notes: formData.notes || '',
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
  // Only prevent deletion if date is locked by a speaker (not just unavailable/conflicting)
  if (date && date.locked_by_id && date.locked_by_id !== 'DELETED') {
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
        response_deadline: Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
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
        response_deadline: Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))
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
     Resend user invitation
     --------------------------- */
    const handleResendUserInvitation = async (invitationId) => {
      try {
        const newToken = generateToken();
        const signupLink = `${window.location.origin}?signup=${newToken}`;
        
        await updateDoc(doc(db, 'invitations', invitationId), {
          token: newToken,
          expires_at: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
          resent_at: serverTimestamp()
        });
        
        await loadInvitations();
        
        // Get the updated invitation
        const invDoc = await getDoc(doc(db, 'invitations', invitationId));
        const invitation = { id: invDoc.id, ...invDoc.data() };
        
        const emailSubject = `Invitation to Join Collaboratorium Barcelona as ${invitation.role}`;
        const emailBody = `Dear ${invitation.full_name},
    
    You have been invited to join the Collaboratorium for Theoretical Modelling and Predictive Biology in Barcelona as a ${invitation.role}.
    
    Your affiliation: ${invitation.affiliation}
    
    Please use the following link to complete your registration:
    ${signupLink}
    
    This invitation will remain valid for 30 days.
    
    Best regards,
    ${userRole.full_name}`;
    
        setInvitationData({
          email: invitation.email,
          subject: emailSubject,
          body: emailBody,
          link: signupLink
        });
        setShowInvitationPanel(true);
        
        alert('Invitation resent successfully!');
      } catch (err) {
        alert('Error resending invitation: ' + (err.message || err));
      }
    };
    
    const handleDeleteUserInvitation = async (invitationId) => {
      if (!window.confirm('Are you sure you want to delete this invitation?')) return;
      try {
        await deleteDoc(doc(db, 'invitations', invitationId));
        await loadInvitations();
        alert('Invitation deleted successfully!');
      } catch (err) {
        alert('Error deleting invitation: ' + (err.message || err));
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
    const handleUpdateAvailability = async (dateId, available, conflictNote) => {
    try {
      const existing = userAvailability.find(ua => ua.user_id === user.uid && ua.date_id === dateId);
      if (existing) {
        await updateDoc(doc(db, 'user_availability', existing.id), { 
          available, 
          conflictNote: conflictNote || null,
          updatedAt: serverTimestamp() 
        });
      } else {
        if (!available || conflictNote) {
          await addDoc(collection(db, 'user_availability'), {
            user_id: user.uid,
            user_name: userRole.full_name,
            date_id: dateId,
            available: available,
            conflictNote: conflictNote || null,
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

  const handleEditMeeting = async (meetingIndex, meetingData) => {
    try {
      const agenda = selectedAgenda;
      const meetings = [...(agenda.meetings || [])];
      
      const meetingDate = new Date(meetingData.date);
      const [sh, sm] = meetingData.start_time.split(':');
      const start = new Date(meetingDate);
      start.setHours(parseInt(sh, 10), parseInt(sm, 10), 0, 0);
      const [eh, em] = meetingData.end_time.split(':');
      const end = new Date(meetingDate);
      end.setHours(parseInt(eh, 10), parseInt(em, 10), 0, 0);
      
      meetings[meetingIndex] = {
        ...meetings[meetingIndex],
        title: meetingData.title,
        type: meetingData.type,
        date: Timestamp.fromDate(meetingDate),
        start_time: Timestamp.fromDate(start),
        end_time: Timestamp.fromDate(end),
        location: meetingData.location || '',
        attendees: meetingData.attendees ? meetingData.attendees.split(',').map(a => a.trim()) : [],
        notes: meetingData.notes || ''
      };
      
      const updatedAgenda = { ...agenda, meetings };
      setSelectedAgenda(updatedAgenda);
      await updateDoc(doc(db, 'agendas', agenda.id), { meetings });
      await loadAgendas();
    } catch (err) {
      alert('Error updating meeting: ' + (err.message || err));
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
        <nav className="w-56 bg-white border-r p-4 space-y-2 min-h-screen">
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
            onMarkLunchBooked={handleMarkLunchReservationBooked}
            currentUser={userRole}
            getRankingColor={getRankingColor}
            getStatusColor={getStatusColor}
            formatDate={formatDate}
            allUsers={allUsers}   
            userAvailability={userAvailability}
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
              onAddDateDirect={handleAddDate}
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
              onResendInvitation={handleResendUserInvitation}
              onDeleteInvitation={handleDeleteUserInvitation}
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
        <aside className="w-[425px] border-l bg-white p-4 min-h-screen">
        {showSidebar && sidebarSpeaker && (
          <ActionsSidebar
            speaker={sidebarSpeaker}
            onClose={() => { setShowSidebar(false); setSidebarSpeaker(null); }}
            onUpdateAction={handleUpdateAction}
            onAddAction={handleAddManualAction}
            currentUser={userRole}
            formatDate={formatDate}
            allUsers={allUsers}
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

      {showAddSpeakerForm && <AddSpeakerForm onSubmit={handleAddSpeaker} onCancel={() => setShowAddSpeakerForm(false)} seniorFellows={seniorFellows} currentUser={userRole} countries={COUNTRIES} availableDates={availableDates} userAvailability={userAvailability} formatDate={formatDate} />}

      {showAddPastSpeakerForm && <AddPastSpeakerForm onSubmit={handleAddPastSpeaker} onCancel={() => setShowAddPastSpeakerForm(false)} seniorFellows={seniorFellows} countries={COUNTRIES} />}

      {showEditSpeakerForm && editingSpeaker && <EditSpeakerForm speaker={editingSpeaker} onSubmit={handleEditSpeaker} onCancel={() => { setShowEditSpeakerForm(false); setEditingSpeaker(null); }} seniorFellows={seniorFellows} countries={COUNTRIES} />}

      {showEditConfirmedForm && editingSpeaker && <EditConfirmedSpeakerForm speaker={editingSpeaker} availableDates={availableDates} onSubmit={handleEditConfirmedSpeaker} onDelete={handleDeleteConfirmedSpeaker} onCancel={() => { setShowEditConfirmedForm(false); setEditingSpeaker(null); }} formatDate={formatDate} seniorFellows={seniorFellows} userAvailability={userAvailability} />}

      {showInviteUserForm && <InviteUserForm onSubmit={handleCreateInvitation} onCancel={() => setShowInviteUserForm(false)} />}

      {showEditUserForm && editingUser && <EditUserForm user={editingUser} onSubmit={handleEditUser} onCancel={() => { setShowEditUserForm(false); setEditingUser(null); }} />}

      {showEditProfileForm && <EditProfileForm userRole={userRole} onSubmit={handleEditOwnProfile} onCancel={() => setShowEditProfileForm(false)} />}
      
      {/* Agenda Modal - ADD THIS */}
      {showAgendaSidebar && selectedAgenda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <AgendaSidebar
              agenda={selectedAgenda}
              onClose={() => { 
                setShowAgendaSidebar(false); 
                setSelectedAgenda(null); 
                setShowAddMeetingForm(false); 
                setSelectedTimeSlot(null);
                setEditingMeeting(null);
                setEditingMeetingIndex(null);
              }}
              onAddMeeting={() => {
                setEditingMeeting(null);
                setEditingMeetingIndex(null);
                setShowAddMeetingForm(true);
              }}
              onEditMeeting={(meeting, index) => {
                setEditingMeeting(meeting);
                setEditingMeetingIndex(index);
                setShowAddMeetingForm(true);
              }}
              onDeleteMeeting={handleDeleteMeeting}
              showAddMeetingForm={showAddMeetingForm}
              onSubmitMeeting={(data) => {
                if (editingMeetingIndex !== null) {
                  handleEditMeeting(editingMeetingIndex, data);
                } else {
                  handleAddMeeting(data);
                }
                setEditingMeeting(null);
                setEditingMeetingIndex(null);
              }}
              onCancelMeeting={() => { 
                setShowAddMeetingForm(false); 
                setSelectedTimeSlot(null);
                setEditingMeeting(null);
                setEditingMeetingIndex(null);
              }}
              selectedTimeSlot={selectedTimeSlot}
              onSelectTimeSlot={setSelectedTimeSlot}
              editingMeeting={editingMeeting}
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
   function InvitedList({ speakers, onResendInvitation, onDeleteInvited, onViewAgenda, formatDate, canEdit, currentUserRole, allUsers, userAvailability, availableDates }) {
    if (!speakers || speakers.length === 0) return <p className="text-sm text-neutral-500">No pending invitations.</p>;
    
    return (
      <div className="space-y-4">
        {/* Color Legend */}
        <div className="flex gap-4 text-xs bg-neutral-50 p-3 rounded-lg border">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-white border-2 border-neutral-300 rounded"></div>
            <span>All proposed speakers available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-100 border-2 border-orange-300 rounded"></div>
            <span>Some proposed speakers unavailable on date</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-100 border-2 border-red-300 rounded"></div>
            <span>Deadline overdue</span>
          </div>
        </div>
        
        <div className="space-y-2">
          {speakers.map(s => {
            const deadline = s.response_deadline ? safeToDate(s.response_deadline) : null;
            const isOverdue = deadline && deadline < new Date();
            
            // Get assigned date
            const assignedDate = availableDates.find(d => d.locked_by_id === s.id);
            
            // Check if any proposed speakers (fellows/organizers) are unavailable on this date
            const hasUnavailableFellows = assignedDate ? userAvailability.some(ua => 
              ua.date_id === assignedDate.id && 
              ua.available === false
            ) : false;
            
            const bgColor = isOverdue 
              ? 'border-red-300 bg-red-50' 
              : hasUnavailableFellows 
              ? 'border-orange-300 bg-orange-50'
              : 'border-neutral-200 bg-white';
            
            return (
              <div key={s.id} className={`border rounded-lg p-3 ${bgColor}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-semibold">{s.full_name}</div>
                      {isOverdue && (
                        <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-semibold rounded">
                          OVERDUE
                        </span>
                      )}
                      {!isOverdue && hasUnavailableFellows && (
                        <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-semibold rounded">
                          ⚠️ CONFLICTS
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-neutral-600">{s.area_of_expertise} • {s.affiliation}</div>
                    <div className="text-xs text-neutral-500 mt-1">
                      Invited: {formatDate(s.invitation_sent_date)} • Deadline: {formatDate(s.response_deadline)}
                      {isOverdue && <span className="text-red-600 font-semibold ml-2">⚠️ Response overdue!</span>}
                      <br />Host: {s.host}
                    </div>
                    
                    {/* Show unavailable fellows */}
                    {!isOverdue && hasUnavailableFellows && assignedDate && (
                      <div className="mt-2 p-2 bg-orange-100 border border-orange-300 rounded text-xs">
                        <div className="font-semibold text-orange-800 mb-1">⚠️ Unavailable Fellows on {formatDate(assignedDate.date)}:</div>
                        <div className="space-y-1">
                          {userAvailability
                            .filter(ua => ua.date_id === assignedDate.id && ua.available === false)
                            .map((ua, idx) => (
                              <div key={idx} className="text-orange-700">
                                • {ua.user_name}
                                {ua.conflictNote && <span className="italic ml-1">({ua.conflictNote})</span>}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {(currentUserRole === 'Organizer' || canEdit(s)) && (
                    <div className="space-y-1 ml-3">
                      <button 
                        onClick={() => onResendInvitation(s)} 
                        className={`px-2 py-1 text-white text-xs rounded w-full ${isOverdue ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                      >
                        {isOverdue ? 'Resend (Overdue)' : 'Resend'}
                      </button>
                      {currentUserRole === 'Organizer' && (
                        <button onClick={() => onDeleteInvited(s.id)} className="px-2 py-1 bg-red-500 text-white text-xs rounded w-full hover:bg-red-600">Delete</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
      const available = availableDates.filter(d => {
        if (!d.available || (d.locked_by_id && d.locked_by_id !== 'DELETED')) return false;
        // Also check if host is available
        const hostUnavailable = userAvailability.find(ua => 
          ua.user_name === speaker.host && 
          ua.date_id === d.id && 
          ua.available === false
        );
        return !hostUnavailable;
      });
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
  
      if (!dateEntry) return null;
  
      // Check if host is unavailable for this date
      const hostUnavailable = userAvailability.find(ua => 
        ua.user_name === speaker.host && 
        ua.date_id === dateEntry.id && 
        ua.available === false
      );
  
      return { 
        dateEntry, 
        hostUnavailable: !!hostUnavailable,
        hostConflictNote: hostUnavailable?.conflictNote || null
      };
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
                    const dateInfo = getDateInfo(day);
                    
                    let bgColor = 'bg-neutral-100 text-neutral-400';
                    let cursor = 'cursor-default';
                    let hoverClass = '';
                    
                    if (dateInfo) {
                      if (dateInfo.hostUnavailable) {
                        // Host is unavailable - orange, not clickable
                        bgColor = 'bg-orange-400 text-white';
                        cursor = 'cursor-not-allowed';
                        hoverClass = '';
                      } else {
                        // Available date
                        cursor = 'cursor-pointer';
                        if (dateInfo.dateEntry.id === selectedDateId) {
                          bgColor = 'bg-primary text-white';
                          hoverClass = 'hover:bg-primary/80';
                        } else {
                          bgColor = 'bg-green-500 text-white';
                          hoverClass = 'hover:bg-green-600';
                        }
                      }
                    }
  
                    return (
                      <div
                        key={day}
                        onClick={() => {
                          if (dateInfo && !dateInfo.hostUnavailable) {
                            setSelectedDateId(dateInfo.dateEntry.id);
                          }
                        }}
                        className={`aspect-square flex items-center justify-center rounded text-sm ${bgColor} ${cursor} ${hoverClass} transition-colors`}
                        title={dateInfo?.hostUnavailable ? `Host unavailable: ${dateInfo.hostConflictNote || 'Conflict'}` : ''}
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
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 bg-orange-400 rounded"></div>
                    <span>Host unavailable</span>
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
                                <div key={idx} className="flex items-start gap-2 text-sm bg-red-50 px-3 py-2 rounded">
                                  <span className="text-red-600 mt-0.5">✗</span>
                                  <div className="flex-1">
                                    <div className="text-neutral-600 font-medium">{ua.user_name}</div>
                                    {ua.conflictNote && (
                                      <div className="text-xs text-red-600 italic mt-1">{ua.conflictNote}</div>
                                    )}
                                  </div>
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
                    <p className="text-sm text-orange-600 mt-1">
                      Orange dates: Your host is unavailable
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
    onVoteSpeaker, onMarkLunchBooked, currentUser, getRankingColor, getStatusColor, formatDate,
    allUsers, userAvailability
  }) {
    const [dismissedAlerts, setDismissedAlerts] = useState(new Set());
    const [dismissedLunchReminders, setDismissedLunchReminders] = useState(new Set());
    const [collapsedSpeakers, setCollapsedSpeakers] = useState(new Set());
    const [viewMode, setViewMode] = useState('collapsed'); // 'expanded' or 'collapsed'
  
    // Initialize all speakers as collapsed
    useEffect(() => {
      const proposedSpeakers = speakers.filter(s => s.status === 'Proposed');
      if (viewMode === 'collapsed') {
        setCollapsedSpeakers(new Set(proposedSpeakers.map(s => s.id)));
      } else {
        setCollapsedSpeakers(new Set());
      }
    }, [viewMode, speakers]);
  
    const toggleSpeaker = (speakerId) => {
      setCollapsedSpeakers(prev => {
        const newSet = new Set(prev);
        if (newSet.has(speakerId)) {
          newSet.delete(speakerId);
        } else {
          newSet.add(speakerId);
        }
        return newSet;
      });
    };
  
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
    
    // Sort proposed speakers by votes (descending) then by priority
    const proposedSpeakers = speakers
      .filter(s => s.status === 'Proposed')
      .sort((a, b) => {
        const aVotes = (a.votes || []).length;
        const bVotes = (b.votes || []).length;
        
        // First sort by votes (descending)
        if (bVotes !== aVotes) {
          return bVotes - aVotes;
        }
        
        // If votes are equal, sort by priority
        const priorityOrder = { 'High Priority': 0, 'Medium Priority': 1, 'Low Priority': 2 };
        return (priorityOrder[a.ranking] || 1) - (priorityOrder[b.ranking] || 1);
      });
    
    const invitedSpeakers = speakers.filter(s => s.status === 'Invited');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingSpeakers = speakers.filter(s => {
      if (s.status !== 'Accepted') return false;
      if (!s.assigned_date) return false;
      const speakerDate = s.assigned_date.toDate ? s.assigned_date.toDate() : new Date(s.assigned_date);
      return speakerDate >= today;
    });
  
    const overdueSpeakers = invitedSpeakers.filter(s => {
      if (!s.response_deadline) return false;
      const deadline = safeToDate(s.response_deadline);
      return deadline < new Date();
    });
  
    const canEditSpeaker = (speaker) => {
      if (currentUser.role === 'Organizer') return true;
      return speaker.host === currentUser.full_name;
    };
  
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
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`lunch-booked-${speaker.id}`}
                            onChange={(e) => {
                              if (e.target.checked) {
                                onMarkLunchBooked(speaker.id);
                              }
                            }}
                            className="w-4 h-4 text-green-600 border-amber-300 rounded focus:ring-amber-500"
                          />
                          <label htmlFor={`lunch-booked-${speaker.id}`} className="text-sm text-amber-800 cursor-pointer">
                            Mark reservation as booked (disables alert for all users)
                          </label>
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
  
        {/* Proposed Speakers - with collapse functionality */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-neutral-800">
              Proposed Speakers Awaiting Review ({proposedSpeakers.length})
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('expanded')}
                className={`px-3 py-1 rounded text-sm ${viewMode === 'expanded' ? 'bg-primary text-white' : 'bg-neutral-200 text-neutral-600'}`}
              >
                Expand All
              </button>
              <button
                onClick={() => setViewMode('collapsed')}
                className={`px-3 py-1 rounded text-sm ${viewMode === 'collapsed' ? 'bg-primary text-white' : 'bg-neutral-200 text-neutral-600'}`}
              >
                Collapse All
              </button>
            </div>
          </div>
          
          {proposedSpeakers.length === 0 ? (
            <p className="text-neutral-500 text-center py-8">No proposed speakers</p>
          ) : (
            <div className="space-y-3">
              {proposedSpeakers.map(s => {
                const isCollapsed = collapsedSpeakers.has(s.id);
                const userVoted = s.votes?.some(v => v.user_id === currentUser.id);
                const voteCount = s.votes?.length || 0;
                
                return (
                  <div 
                    key={s.id} 
                    className="border border-neutral-200 rounded-lg hover:border-primary transition-colors cursor-pointer"
                    onClick={() => toggleSpeaker(s.id)}
                  >
                    {/* Collapsed View */}
                    {isCollapsed ? (
                      <div className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <span className="text-neutral-500">▶</span>
                          <div className="font-semibold">{s.full_name}</div>
                          <div className="text-sm text-neutral-600">{s.affiliation}</div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${getRankingColor(s.ranking)}`}>
                            {s.ranking}
                          </span>
                          <div className="px-3 py-1 rounded text-sm font-medium border border-primary text-primary bg-primary/5">
                            👍 {voteCount}
                          </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onVoteSpeaker(s.id, 'upvote');
                            }}
                            className={`px-3 py-1 rounded text-sm font-medium ${
                              userVoted 
                                ? 'bg-primary text-white' 
                                : 'border border-primary text-primary hover:bg-primary hover:text-white'
                            }`}
                          >
                            👍 {voteCount}
                          </button>
                          {currentUser.role === 'Organizer' && (
                            <>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAcceptSpeaker(s.id);
                                }} 
                                className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                              >
                                Invite
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRejectSpeaker(s.id);
                                }} 
                                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                              >
                                Decline
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Expanded View */
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-neutral-500">▼</span>
                              <div className="font-semibold text-lg text-neutral-800">{s.full_name}</div>
                            </div>
                            <div className="text-sm text-neutral-600 mt-1 ml-7">
                              {s.area_of_expertise} • {s.affiliation} • {s.country}
                            </div>
                            <div className="text-xs text-neutral-500 mt-2 ml-7">
                              Proposed by {s.proposed_by_name} • Host: {s.host}
                            </div>
                            {s.notes && (
                              <div className="text-sm text-neutral-600 mt-2 italic bg-neutral-50 p-2 rounded ml-7">
                                {s.notes}
                              </div>
                            )}
                            <div className="mt-2 ml-7">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-white ${getRankingColor(s.ranking)}`}>
                                {s.ranking}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onVoteSpeaker(s.id, 'upvote');
                              }}
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAcceptSpeaker(s.id);
                                  }} 
                                  className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors"
                                >
                                  Invite
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRejectSpeaker(s.id);
                                  }} 
                                  className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors"
                                >
                                  Decline
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
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
            allUsers={allUsers}
            userAvailability={userAvailability}
            availableDates={availableDates}
          />
        </div>
  
        {/* Confirmed Upcoming Speakers - with travel arrangements highlighting */}
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
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700">Travel</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingSpeakers.map(s => {
                    const hasTravelArrangements = s.actions?.some(a => 
                      a.type === 'travel_arrangements' && a.completed
                    );
                    
                    return (
                      <tr key={s.id} className={`border-b border-neutral-100 hover:bg-neutral-50 ${!hasTravelArrangements ? 'bg-amber-50' : ''}`}>
                        <td className="py-3 px-4">{s.full_name}</td>
                        <td className="py-3 px-4">{s.talk_title || '(TBC)'}</td>
                        <td className="py-3 px-4">{formatDate(s.assigned_date)}</td>
                        <td className="py-3 px-4">{s.host}</td>
                        <td className="py-3 px-4">
                          {hasTravelArrangements ? (
                            <span className="text-green-600 font-semibold">✓ Arranged</span>
                          ) : (
                            <span className="text-amber-600 font-semibold">⚠ Pending</span>
                          )}
                        </td>
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
                    );
                  })}
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
   AvailabilityView - Updated with conflict support
   --------------------- */
   function AvailabilityView({ dates, userAvailability, currentUser, onUpdateAvailability, formatDate }) {
    const [currentMonth, setCurrentMonth] = useState(getInitialMonth());
    const [selectedDate, setSelectedDate] = useState(null);
    const [showDateModal, setShowDateModal] = useState(false);
    const [conflictNote, setConflictNote] = useState('');
    const [availabilityChoice, setAvailabilityChoice] = useState('available');
    
    function getInitialMonth() {
      if (dates.length === 0) return new Date();
      const firstDate = dates[0].date?.toDate ? dates[0].date.toDate() : new Date(dates[0].date);
      return new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
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
      
      return { 
        dateEntry, 
        available: ua ? ua.available : true,
        conflictNote: ua?.conflictNote || null
      };
    };
  
    const handleDateClick = (day) => {
      const checkDate = new Date(year, month, day);
      setSelectedDate(checkDate);
      
      // Pre-fill existing data if available
      const checkDateString = checkDate.toISOString().split('T')[0];
      const dateEntry = dates.find(d => {
        const entryDate = d.date?.toDate ? d.date.toDate() : new Date(d.date);
        return entryDate.toISOString().split('T')[0] === checkDateString;
      });
      
      if (dateEntry) {
        const ua = userAvailability.find(u => u.user_id === currentUser.id && u.date_id === dateEntry.id);
        if (ua) {
          setAvailabilityChoice(ua.conflictNote ? 'conflict' : (ua.available ? 'available' : 'unavailable'));
          setConflictNote(ua.conflictNote || '');
        } else {
          setAvailabilityChoice('available');
          setConflictNote('');
        }
      }
      
      setShowDateModal(true);
    };
  
    const handleSaveAvailability = () => {
      const checkDate = selectedDate;
      checkDate.setHours(0, 0, 0, 0);
      
      const dateEntry = dates.find(d => {
        const entryDate = d.date?.toDate ? d.date.toDate() : new Date(d.date);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate.getTime() === checkDate.getTime();
      });
  
      if (dateEntry) {
        const isAvailable = availabilityChoice === 'available';
        const note = availabilityChoice === 'conflict' ? conflictNote : null;
        onUpdateAvailability(dateEntry.id, isAvailable, note);
      } else {
        alert('This date needs to be added to available dates first');
      }
      
      setShowDateModal(false);
      setSelectedDate(null);
      setConflictNote('');
      setAvailabilityChoice('available');
    };
    
    // Filter to only show unavailable dates
    const unavailableDates = dates.filter(d => {
      const ua = userAvailability.find(u => u.user_id === currentUser.id && u.date_id === d.id);
      return ua && ua.available === false;
    });
  
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
            <span>Conflicting date</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Locked (speaker assigned)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-neutral-200 rounded"></div>
            <span>No seminar scheduled</span>
          </div>
        </div>
  
        <div className="grid grid-cols-2 gap-6">
          {/* Left: Calendar */}
          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} 
                className="px-3 py-1 bg-primary text-white rounded hover:bg-primary/80 text-sm">
                ←
              </button>
              <h3 className="text-base font-semibold">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} 
                className="px-3 py-1 bg-primary text-white rounded hover:bg-primary/80 text-sm">
                →
              </button>
            </div>
  
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <div key={idx} className="text-center font-semibold text-xs text-neutral-600 py-1">
                  {day}
                </div>
              ))}
            </div>
  
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startingDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} className="aspect-square"></div>
              ))}
  
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const day = idx + 1;
                const dateInfo = getDateInfo(day);
                
                let bgColor = 'bg-neutral-100';
                let textColor = '';
                let cursor = 'cursor-pointer';
                let hoverClass = 'hover:bg-neutral-200';
                
                if (dateInfo) {
                  if (!dateInfo.dateEntry.available) {
                    // Locked by speaker
                    bgColor = 'bg-blue-500';
                    textColor = 'text-white';
                    hoverClass = 'hover:bg-blue-600';
                  } else if (dateInfo.conflictNote) {
                    // Has conflict
                    bgColor = 'bg-orange-500';
                    textColor = 'text-white';
                    hoverClass = 'hover:bg-orange-600';
                  } else if (dateInfo.available) {
                    bgColor = 'bg-green-500';
                    textColor = 'text-white';
                    hoverClass = 'hover:bg-green-600';
                  } else {
                    bgColor = 'bg-orange-500';
                    textColor = 'text-white';
                    hoverClass = 'hover:bg-orange-600';
                  }
                }
  
                return (
                  <div
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`aspect-square flex items-center justify-center rounded text-sm font-medium ${bgColor} ${textColor} ${cursor} ${hoverClass} transition-colors`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
  
          {/* Right: Unavailable Dates Only */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Unavailable Dates</h3>
            {unavailableDates.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-8">You have no unavailable dates marked.</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {unavailableDates.map(d => {
                  const ua = userAvailability.find(u => u.user_id === currentUser.id && u.date_id === d.id);
                  const conflictNote = ua?.conflictNote || null;
                  const isLocked = !d.available;
                  
                  let bgColor = 'bg-orange-50 border-orange-200';
                  let statusColor = 'bg-orange-100 text-orange-800';
                  let statusText = '✗ Unavailable';
                  
                  if (conflictNote) {
                    statusText = '⚠ Conflict';
                  }
                  
                  return (
                    <div key={d.id} className={`border rounded-lg p-3 ${bgColor}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-base bg-white inline-block px-2 py-1 rounded">
                            {formatDate(d.date)}
                          </div>
                          <div className="text-sm text-neutral-600 mt-1">
                            <strong>Host:</strong> {d.host}
                          </div>
                          {d.notes && (
                            <div className="text-xs text-neutral-500 mt-1">
                              📍 {d.notes}
                            </div>
                          )}
                          {conflictNote && (
                            <div className="text-xs text-orange-700 mt-2 bg-white p-2 rounded italic">
                              <strong>Your conflict:</strong> {conflictNote}
                            </div>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                          {statusText}
                        </span>
                      </div>
                      {!isLocked && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateAvailability(d.id, true, null);
                          }}
                          className="w-full px-3 py-2 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 transition-colors"
                        >
                          Mark as Available
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
  
        {/* Date Selection Modal */}
        {showDateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">
                Set Availability for {selectedDate?.toLocaleDateString()}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="availability" 
                      value="available"
                      checked={availabilityChoice === 'available'}
                      onChange={(e) => {
                        setAvailabilityChoice('available');
                        setConflictNote('');
                      }}
                    />
                    <span className="text-green-600 font-medium">Available</span>
                  </label>
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="availability" 
                      value="conflict"
                      checked={availabilityChoice === 'conflict'}
                      onChange={(e) => setAvailabilityChoice('conflict')}
                    />
                    <span className="text-orange-600 font-medium">Unavailable due to conflict</span>
                  </label>
                  {availabilityChoice === 'conflict' && (
                    <textarea
                      className="w-full mt-2 border rounded px-3 py-2 text-sm min-h-[80px]"
                      placeholder="Explain the conflict..."
                      value={conflictNote}
                      onChange={(e) => setConflictNote(e.target.value)}
                      rows={3}
                    />
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleSaveAvailability}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded hover:bg-primary/80"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setShowDateModal(false);
                      setSelectedDate(null);
                      setConflictNote('');
                      setAvailabilityChoice('available');
                    }}
                    className="flex-1 px-4 py-2 border rounded hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

/* ---------------------
   StatisticsView with Modals (keeping bar charts)
   --------------------- */
   function StatisticsView({ speakers, formatDate, onAddPastSpeaker, isOrganizer }) {
    const [selectedYear, setSelectedYear] = useState('all');
    const [collapsedYears, setCollapsedYears] = useState(new Set());
    const [showCountriesModal, setShowCountriesModal] = useState(false);
    const [showAffiliationsModal, setShowAffiliationsModal] = useState(false);
    
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
  
    // Smooth scroll to speakers section
    const scrollToSpeakers = () => {
      const element = document.getElementById('speakers-by-year-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
  
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
  
    const affiliationsData = filteredSpeakers.reduce((acc, s) => {
      if (s.affiliation && s.affiliation.trim()) {
        if (!acc[s.affiliation]) {
          acc[s.affiliation] = [];
        }
        acc[s.affiliation].push(s.full_name);
      }
      return acc;
    }, {});
  
    const uniqueAffiliations = Object.keys(affiliationsData).sort();
    const affiliationCount = uniqueAffiliations.length;
  
    // CONTINENT MAPPING using country codes (more reliable)
    const getContinent = (countryName) => {
      if (!countryName) return 'Unknown';
      
      // Try to get country code from country name
      let countryCode;
      try {
        countryCode = getCode(countryName);
      } catch (e) {
        // If getCode fails, try manual lookup
        countryCode = null;
      }
      
      // If we couldn't get a code, try some manual mappings for country-list format
      if (!countryCode) {
        const normalized = countryName.toLowerCase().trim();
        const manualMappings = {
          // Common short names
          'united kingdom': 'GB',
          'uk': 'GB',
          'united states': 'US',
          'usa': 'US',
          'us': 'US',
          // Other common variatio  ns
          'south korea': 'KR',
          'north korea': 'KP',
          'russia': 'RU',
          'czechia': 'CZ',
                
          // Official country-list names
          'united states of america (the)': 'US',
          'united kingdom of great britain and northern ireland (the)': 'GB',
          'netherlands (the)': 'NL',
          'philippines (the)': 'PH',
          'russian federation (the)': 'RU',
          'czech republic (the)': 'CZ',
          'republic of korea': 'KR',
          "korea (the republic of)": 'KR',
          "democratic people's republic of korea": 'KP',

        };
        countryCode = manualMappings[normalized];
      }
      
      if (!countryCode) {
        console.warn(`⚠️ Could not find country code for: "${countryName}"`);
        return 'Other';
      }
      
      // Spain gets its own category
      if (countryCode === 'ES') return 'Spain';
      
      // Europe (excluding Spain)
      const europe = [
        'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 
        'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 
        'PL', 'PT', 'RO', 'SK', 'SI', 'SE', 'GB', 'NO', 'CH', 'IS',
        'AL', 'RS', 'BA', 'ME', 'MK', 'RU', 'UA', 'BY', 'MD', 'LI', 'MC',
      ];
      if (europe.includes(countryCode)) return 'Europe\n(excl. Spain)';
      
      // North America
      const northAmerica = ['US', 'CA', 'MX'];
      if (northAmerica.includes(countryCode)) return 'North America';
      
      // South America
      const southAmerica = [
        'BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY', 
        'GY', 'SR', 'GF'
      ];
      if (southAmerica.includes(countryCode)) return 'South America';
      
      // Asia & Middle East
      const asia = [
        'CN', 'JP', 'IN', 'KR', 'SG', 'TH', 'VN', 'ID', 'MY', 'PH', 
        'PK', 'BD', 'TW', 'HK', 'IL', 'AE', 'SA', 'TR', 'IR', 'IQ', 
        'JO', 'LB', 'SY', 'YE', 'OM', 'KW', 'QA', 'BH', 'AF', 'MM', 
        'KH', 'LA', 'NP', 'LK', 'MN', 'KZ', 'UZ', 'AZ', 'AM', 'GE',
        'TJ', 'TM', 'KG'
      ];
      if (asia.includes(countryCode)) return 'Asia';
      
      // Africa
      const africa = [
        'ZA', 'EG', 'NG', 'KE', 'MA', 'TN', 'DZ', 'GH', 'ET', 'TZ', 
        'UG', 'ZW', 'BW', 'NA', 'ZM', 'MZ', 'AO', 'SD', 'LY', 'SN', 
        'CI', 'CM', 'MG', 'RW', 'SO', 'CD', 'CG'
      ];
      if (africa.includes(countryCode)) return 'Africa';
      
      // Oceania
      const oceania = [
        'AU', 'NZ', 'FJ', 'PG', 'WS', 'TO', 'VU', 'SB'
      ];
      if (oceania.includes(countryCode)) return 'Oceania';
      
      console.warn(`⚠️ Unmapped country code: ${countryCode} (${countryName})`);
      return 'Other';
    };
  
    // Create continent data
    const continentData = filteredSpeakers.reduce((acc, s) => {
      const continent = getContinent(s.country);
      acc[continent] = (acc[continent] || 0) + 1;
      return acc;
    }, {});
  
    // Convert to chart format
    const continentChartData = Object.entries(continentData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Sort by count descending
  
    const COLORS = ['#d63447', '#3498db', '#e67e22', '#f1c40f', '#2ecc71', '#95a5a6', '#9b59b6', '#1abc9c'];
    
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
              <div 
                style={{...styles.statCard, cursor: 'pointer'}} 
                onClick={scrollToSpeakers}
                title="Click to jump to speakers list"
              >
                <div style={styles.statNumber}>{filteredSpeakers.length}</div>
                <div style={styles.statLabel}>Total Speakers</div>
                <div style={{fontSize: '12px', marginTop: '5px', color: '#3498db'}}>
                  (Click to view list ↓)
                </div>
              </div>
              <div 
                style={{...styles.statCard, cursor: 'pointer'}} 
                onClick={() => setShowCountriesModal(true)}
              >
                <div style={styles.statNumber}>{Object.keys(countryData).length}</div>
                <div style={styles.statLabel}>Countries</div>
                <div style={{fontSize: '12px', marginTop: '5px', color: '#3498db'}}>
                  (Click to view list)
                </div>
              </div>
              <div 
                style={{...styles.statCard, cursor: 'pointer'}} 
                onClick={() => setShowAffiliationsModal(true)}
              >
                <div style={styles.statNumber}>{affiliationCount}</div>
                <div style={styles.statLabel}>Different Affiliations</div>
                <div style={{fontSize: '12px', marginTop: '5px', color: '#3498db'}}>
                  (Click to view list)
                </div>
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
              <h3 style={styles.chartTitle}>Distribution by Continent</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={continentChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({cx, cy, midAngle, innerRadius, outerRadius, percent, name}) => {
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 25;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      const percentText = `${(percent * 100).toFixed(0)}%`;
                      
                      // Check if name contains line break
                      const lines = name.split('\n');
                      
                      if (lines.length > 1) {
                        return (
                          <text 
                            x={x} 
                            y={y} 
                            fill="black" 
                            textAnchor={x > cx ? 'start' : 'end'} 
                            dominantBaseline="central"
                            fontSize="12"
                          >
                            <tspan x={x} dy="-0.6em">{lines[0]}</tspan>
                            <tspan x={x} dy="1.2em">{lines[1]} {percentText}</tspan>
                          </text>
                        );
                      }
                      
                      // Single line
                      return (
                        <text 
                          x={x} 
                          y={y} 
                          fill="black" 
                          textAnchor={x > cx ? 'start' : 'end'} 
                          dominantBaseline="central"
                          fontSize="12"
                        >
                          {name} {percentText}
                        </text>
                      );
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {continentChartData.map((entry, index) => (
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
  
        {/* Countries Modal */}
        {showCountriesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b flex items-center justify-between bg-primary text-white">
                <h3 className="text-xl font-semibold">Countries ({Object.keys(countryData).length})</h3>
                <button 
                  onClick={() => setShowCountriesModal(false)}
                  className="text-white hover:text-neutral-200"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(countryData)
                    .sort((a, b) => b[1] - a[1])
                    .map(([country, count]) => (
                      <div key={country} className="border rounded-lg p-3 hover:bg-neutral-50">
                        <div className="font-semibold">{country}</div>
                        <div className="text-sm text-neutral-600">{count} speaker{count !== 1 ? 's' : ''}</div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
  
        {/* Affiliations Modal */}
        {showAffiliationsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b flex items-center justify-between bg-primary text-white">
                <h3 className="text-xl font-semibold">Different Affiliations ({uniqueAffiliations.length})</h3>
                <button 
                  onClick={() => setShowAffiliationsModal(false)}
                  className="text-white hover:text-neutral-200"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="space-y-3">
                  {uniqueAffiliations.map(affiliation => (
                    <div key={affiliation} className="border rounded-lg p-4 hover:bg-neutral-50">
                      <div className="font-semibold mb-2">{affiliation}</div>
                      <div className="text-sm text-neutral-600">
                        Speakers: {affiliationsData[affiliation].join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
  
        {/* Speakers by Year section */}
        <div id="speakers-by-year-section" style={styles.section}>
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
   function DatesView({ dates, speakers, onAddDateDirect, onDeleteDate, formatDate }) {
    const getInitialMonth = () => {
      if (dates.length === 0) return new Date();
      const firstDate = dates[0].date?.toDate ? dates[0].date.toDate() : new Date(dates[0].date);
      return new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
    };
    
    const [currentMonth, setCurrentMonth] = useState(getInitialMonth());
    const [showAddDateModal, setShowAddDateModal] = useState(false);
    const [showEditDateModal, setShowEditDateModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedDateEntry, setSelectedDateEntry] = useState(null);
    const [dateType, setDateType] = useState('available');
    const [dateNotes, setDateNotes] = useState('');
  
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
      return speaker;
    };
    
    const handleDateClick = (day) => {
      const checkDate = new Date(year, month, day);
      const existing = getDateInfo(day);
      
      if (existing) {
        // Existing date - show in right panel and allow editing
        setSelectedDateEntry(existing);
        setSelectedDate(null);
      } else {
        // New date - show add modal
        setSelectedDate(checkDate);
        setDateType('available');
        setDateNotes('');
        setShowAddDateModal(true);
      }
    };
    
    const handleSaveDate = () => {
      if (!selectedDate) return;
      
      const dateToSave = new Date(selectedDate);
      dateToSave.setHours(12, 0, 0, 0);
      
      onAddDateDirect({
        date: dateToSave.toISOString().split('T')[0],
        type: dateType,
        host: '', // No host when adding
        notes: dateNotes
      });
      
      setShowAddDateModal(false);
      setSelectedDate(null);
      setDateType('available');
      setDateNotes('');
    };
  
    const handleEditDate = () => {
      if (!selectedDateEntry) return;
      
      // Determine the action based on the new status
      if (dateType === 'delete') {
        onDeleteDate(selectedDateEntry.id);
        setSelectedDateEntry(null);
      } else {
        // Update the date status
        const updateData = {
          is_conflicting: dateType === 'conflicting',
          available: dateType === 'available',
          notes: dateNotes
        };
        
        // Call update handler
        handleUpdateDate(selectedDateEntry.id, updateData);
      }
      
      setShowEditDateModal(false);
    };
  
    const handleUpdateDate = async (dateId, updateData) => {
      try {
        await updateDoc(doc(db, 'available_dates', dateId), updateData);
        // Reload dates - trigger parent refresh
        window.location.reload();
      } catch (err) {
        alert('Error updating date: ' + (err.message || err));
      }
    };
  
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold">Available Dates</h2>
        </div>
        
        {/* Legend */}
        <div className="flex gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span>Conflicting/Unavailable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
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
                let cursor = 'cursor-pointer';
                let hoverClass = 'hover:bg-neutral-200';
                
                if (dateEntry) {
                  cursor = 'cursor-pointer';
                  if (!dateEntry.available && dateEntry.locked_by_id && dateEntry.locked_by_id !== 'DELETED') {
                    // Locked by speaker
                    bgColor = 'bg-blue-500';
                    textColor = 'text-white';
                    hoverClass = 'hover:bg-blue-600';
                  } else if (dateEntry.is_conflicting || !dateEntry.available) {
                    // Conflicting date
                    bgColor = 'bg-orange-500';
                    textColor = 'text-white';
                    hoverClass = 'hover:bg-orange-600';
                  } else {
                    // Available
                    bgColor = 'bg-green-500';
                    textColor = 'text-white';
                    hoverClass = 'hover:bg-green-600';
                  }
                  
                  // Highlight if selected
                  if (selectedDateEntry?.id === dateEntry.id) {
                    bgColor += ' ring-4 ring-primary';
                  }
                }
  
                return (
                  <div
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`aspect-square flex items-center justify-center rounded text-sm font-medium ${bgColor} ${textColor} ${cursor} ${hoverClass} transition-all`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
            
            <p className="text-xs text-neutral-500 mt-3 text-center">
              Click on dates to view/edit or add new
            </p>
          </div>
  
          {/* Right: Selected Date Info */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Date Information</h3>
            {selectedDateEntry ? (
              <div className="space-y-4">
                {/* Date Info Card */}
                <div className={`border-2 rounded-lg p-4 ${
                  !selectedDateEntry.available && selectedDateEntry.locked_by_id && selectedDateEntry.locked_by_id !== 'DELETED'
                    ? 'bg-blue-50 border-blue-300'
                    : selectedDateEntry.is_conflicting || !selectedDateEntry.available
                    ? 'bg-orange-50 border-orange-300'
                    : 'bg-green-50 border-green-300'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-semibold text-xl mb-2">{formatDate(selectedDateEntry.date)}</div>
                      {selectedDateEntry.host && (
                        <div className="text-sm mb-2">
                          <strong>Host:</strong> {selectedDateEntry.host}
                        </div>
                      )}
                      {selectedDateEntry.notes && (
                        <div className="text-sm mb-2">
                          <strong>Notes:</strong> {selectedDateEntry.notes}
                        </div>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      !selectedDateEntry.available && selectedDateEntry.locked_by_id && selectedDateEntry.locked_by_id !== 'DELETED'
                        ? 'bg-blue-100 text-blue-800'
                        : selectedDateEntry.is_conflicting || !selectedDateEntry.available
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {!selectedDateEntry.available && selectedDateEntry.locked_by_id && selectedDateEntry.locked_by_id !== 'DELETED'
                        ? '🔒 Locked'
                        : selectedDateEntry.is_conflicting || !selectedDateEntry.available
                        ? '⚠️ Conflicting'
                        : '✓ Available'}
                    </span>
                  </div>
                  
                  {/* Speaker Info if Locked */}
                  {(() => {
                    const speaker = getSpeakerForDate(selectedDateEntry);
                    if (speaker) {
                      return (
                        <div className="border-t pt-3 mt-3">
                          <div className="text-sm font-semibold mb-2">Speaker Information</div>
                          <div className="text-sm space-y-1">
                            <div><strong>Name:</strong> {speaker.full_name}</div>
                            <div><strong>Talk:</strong> {speaker.talk_title || 'TBC'}</div>
                            <div><strong>Email:</strong> {speaker.email}</div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                
                {/* Edit Button */}
                {(!selectedDateEntry.locked_by_id || selectedDateEntry.locked_by_id === 'DELETED') && (
                  <button
                    onClick={() => {
                      setDateType(selectedDateEntry.is_conflicting ? 'conflicting' : 'available');
                      setDateNotes(selectedDateEntry.notes || '');
                      setShowEditDateModal(true);
                    }}
                    className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary/80"
                  >
                    Edit Date
                  </button>
                )}
                
                {selectedDateEntry.locked_by_id && selectedDateEntry.locked_by_id !== 'DELETED' && (
                  <div className="text-xs text-neutral-500 italic text-center py-2">
                    Cannot edit locked dates
                  </div>
                )}
              </div>
            ) : (
              <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center">
                <p className="text-neutral-500 mb-2">📅</p>
                <p className="text-neutral-600 font-medium">Select a date from the calendar</p>
                <p className="text-sm text-neutral-500 mt-1">
                  Click on existing dates to view details or empty dates to add new
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Add Date Modal */}
        {showAddDateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">
                Add Date: {selectedDate?.toLocaleDateString()}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Type *</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="datetype"
                        value="available"
                        checked={dateType === 'available'}
                        onChange={(e) => setDateType('available')}
                      />
                      <span className="text-green-600 font-medium">Available</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="datetype"
                        value="conflicting"
                        checked={dateType === 'conflicting'}
                        onChange={(e) => setDateType('conflicting')}
                      />
                      <span className="text-orange-600 font-medium">Conflicting/Unavailable</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                  <textarea
                    className="w-full border rounded px-3 py-2 min-h-[80px]"
                    placeholder="Location, reason for conflict, etc."
                    value={dateNotes}
                    onChange={(e) => setDateNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleSaveDate}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded hover:bg-primary/80"
                  >
                    Add Date
                  </button>
                  <button
                    onClick={() => {
                      setShowAddDateModal(false);
                      setSelectedDate(null);
                      setDateType('available');
                      setDateNotes('');
                    }}
                    className="flex-1 px-4 py-2 border rounded hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Edit Date Modal */}
        {showEditDateModal && selectedDateEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">
                Edit Date: {formatDate(selectedDateEntry.date)}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Status *</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="editdatetype"
                        value="available"
                        checked={dateType === 'available'}
                        onChange={(e) => setDateType('available')}
                      />
                      <span className="text-green-600 font-medium">Available</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="editdatetype"
                        value="conflicting"
                        checked={dateType === 'conflicting'}
                        onChange={(e) => setDateType('conflicting')}
                      />
                      <span className="text-orange-600 font-medium">Conflicting/Unavailable</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="editdatetype"
                        value="delete"
                        checked={dateType === 'delete'}
                        onChange={(e) => setDateType('delete')}
                      />
                      <span className="text-red-600 font-medium">Delete Date</span>
                    </label>
                  </div>
                </div>
                
                {dateType !== 'delete' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                    <textarea
                      className="w-full border rounded px-3 py-2 min-h-[80px]"
                      placeholder="Location, reason for conflict, etc."
                      value={dateNotes}
                      onChange={(e) => setDateNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                )}
                
                {dateType === 'delete' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    <strong>Warning:</strong> This will permanently delete this date.
                  </div>
                )}
                
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleEditDate}
                    className={`flex-1 px-4 py-2 text-white rounded ${
                      dateType === 'delete' 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-primary hover:bg-primary/80'
                    }`}
                  >
                    {dateType === 'delete' ? 'Delete' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setShowEditDateModal(false);
                      setDateType('available');
                      setDateNotes('');
                    }}
                    className="flex-1 px-4 py-2 border rounded hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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
   function InvitationsView({ invitations, onCreateInvitation, onResendInvitation, onDeleteInvitation, formatDate }) {
    return (
      <div className="bg-white rounded shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">User Invitations</h2>
          <button onClick={onCreateInvitation} className="px-3 py-1 bg-primary text-white rounded">Create Invitation</button>
        </div>
        {invitations.length === 0 ? <p className="text-sm text-neutral-500">No invitations.</p> : (
          <div className="space-y-3">
            {invitations.map(inv => {
              const isExpired = inv.expires_at && (inv.expires_at.toDate ? inv.expires_at.toDate() : new Date(inv.expires_at)) < new Date();
              const isUsed = inv.used;
              
              return (
                <div 
                  key={inv.id} 
                  className={`border rounded-lg p-4 ${
                    isUsed ? 'bg-green-50 border-green-200' : 
                    isExpired ? 'bg-red-50 border-red-200' : 
                    'bg-white border-neutral-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-semibold">{inv.full_name}</div>
                        {isUsed && (
                          <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-semibold rounded">
                            ✓ USED
                          </span>
                        )}
                        {!isUsed && isExpired && (
                          <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-semibold rounded">
                            ⚠️ EXPIRED
                          </span>
                        )}
                        {!isUsed && !isExpired && (
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded">
                            PENDING
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-neutral-600 mb-1">
                        <strong>Email:</strong> {inv.email}
                      </div>
                      <div className="text-sm text-neutral-600 mb-1">
                        <strong>Role:</strong> {inv.role} • <strong>Affiliation:</strong> {inv.affiliation}
                      </div>
                      <div className="text-xs text-neutral-500">
                        Created: {formatDate(inv.createdAt)} • Expires: {formatDate(inv.expires_at)}
                        {inv.resent_at && (
                          <span className="ml-2">• Resent: {formatDate(inv.resent_at)}</span>
                        )}
                      </div>
                      {isUsed && inv.used_at && (
                        <div className="text-xs text-green-600 font-semibold mt-1">
                          ✓ Used on {formatDate(inv.used_at)}
                        </div>
                      )}
                    </div>
                    
                    {!isUsed && (
                      <div className="flex flex-col gap-2 ml-4">
                        <button 
                          onClick={() => onResendInvitation(inv.id)}
                          className={`px-3 py-1 text-white text-xs rounded ${
                            isExpired ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                          title={isExpired ? 'Resend with new expiry date' : 'Resend invitation'}
                        >
                          {isExpired ? '🔄 Resend (Expired)' : '🔄 Resend'}
                        </button>
                        <button 
                          onClick={() => onDeleteInvitation(inv.id)}
                          className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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

  function ActionsSidebar({ speaker, onClose, onUpdateAction, onAddAction, currentUser, formatDate, allUsers }) {
    const [collapsedCards, setCollapsedCards] = useState(new Set());
    
    const inviteLink = `${window.location.origin}?token=${speaker.access_token}`;
    const emailSubject = 'Invitation to Present at Collaboratorium Barcelona';

    const emailBody = `Dear ${speaker.full_name},

    We are delighted to invite you to present a seminar at the Collaboratorium for Theoretical Modelling and Predictive Biology in Barcelona.

    Your host will be ${speaker.host}.

    Please visit the following link to accept and choose your preferred date:
    ${inviteLink}

    This invitation will remain valid for 14 days. If you have any questions, please don't hesitate to reach out.

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
                          <p style={styles.emailLabel}><strong>To:</strong> {speaker.email}</p>
                          <p style={styles.emailLabel}>
                            <strong>CC:</strong> {(() => {
                              const organizers = allUsers.filter(u => u.role === 'Organizer');
                              const organizersEmails = organizers.map(o => o.email);
                              const host = allUsers.find(u => u.full_name === speaker.host);
                              const hostEmail = host ? host.email : '';
                              
                              // Only add host email if not already in organizers list
                              const ccEmailsSet = new Set(organizersEmails);
                              if (hostEmail && !ccEmailsSet.has(hostEmail)) {
                                ccEmailsSet.add(hostEmail);
                              }
                              
                              const ccEmails = Array.from(ccEmailsSet).join(', ');
                              return ccEmails || 'N/A';
                            })()}
                          </p>
                          <p style={styles.emailLabel}><strong>Subject:</strong> {emailSubject}</p>
                          <div style={styles.emailBody}>
                            {emailBody.split('\n').map((line, i) => (
                              <p key={i} style={{margin: '8px 0'}}>{line}</p>
                            ))}
                          </div>
                          <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                            <button
                              onClick={() => {
                                const organizers = allUsers.filter(u => u.role === 'Organizer');
                                const organizersEmails = organizers.map(o => o.email);
                                const host = allUsers.find(u => u.full_name === speaker.host);
                                const hostEmail = host ? host.email : '';
                                
                                // Only add host email if not already in organizers list
                                const ccEmailsSet = new Set(organizersEmails);
                                if (hostEmail && !ccEmailsSet.has(hostEmail)) {
                                  ccEmailsSet.add(hostEmail);
                                }
                                
                                const ccEmails = Array.from(ccEmailsSet).join(',');
                                
                                const mailtoLink = `mailto:${speaker.email}?cc=${encodeURIComponent(ccEmails)}&subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
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
    onEditMeeting,
    onDeleteMeeting, 
    showAddMeetingForm,
    onSubmitMeeting,
    onCancelMeeting,
    selectedTimeSlot,
    onSelectTimeSlot,
    editingMeeting,
    formatDate,
    currentUser
  }) {
    const [shareMenuOpen, setShareMenuOpen] = useState(false);
    
    // Get the three days (day before, talk day, day after)
    const seminarDate = agenda.seminar_date?.toDate ? agenda.seminar_date.toDate() : new Date(agenda.seminar_date);
    const startDate = agenda.start_date?.toDate ? agenda.start_date.toDate() : new Date(agenda.start_date);
    const endDate = agenda.end_date?.toDate ? agenda.end_date.toDate() : new Date(agenda.end_date);
    
    const days = [startDate, seminarDate, endDate];
    
    // Generate time slots from 8am to 8pm in 15-minute intervals
    const timeSlots = [];
    for (let hour = 8; hour <= 20; hour++) {
      [0, 15, 30, 45].forEach(minute => {
        if (hour === 20 && minute > 0) return; // Stop at 8:00 PM
        timeSlots.push({ hour, minute });
      });
    }
    
    // Format time in 12-hour format
    const formatTime12h = (hour, minute) => {
      const period = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
    };
    
    // Get meetings that overlap with a time slot
    const getMeetingsForSlot = (day, slotHour, slotMinute) => {
      return (agenda.meetings || []).filter(meeting => {
        const meetingDate = meeting.date?.toDate ? meeting.date.toDate() : new Date(meeting.date);
        const meetingStart = meeting.start_time?.toDate ? meeting.start_time.toDate() : new Date(meeting.start_time);
        const meetingEnd = meeting.end_time?.toDate ? meeting.end_time.toDate() : new Date(meeting.end_time);
        
        if (meetingDate.toDateString() !== day.toDateString()) return false;
        
        const slotTime = slotHour * 60 + slotMinute;
        const meetingStartTime = meetingStart.getHours() * 60 + meetingStart.getMinutes();
        const meetingEndTime = meetingEnd.getHours() * 60 + meetingEnd.getMinutes();
        
        return slotTime >= meetingStartTime && slotTime < meetingEndTime;
      });
    };
    
    // Calculate how many slots a meeting spans
    const getMeetingSpan = (meeting) => {
      const start = meeting.start_time?.toDate ? meeting.start_time.toDate() : new Date(meeting.start_time);
      const end = meeting.end_time?.toDate ? meeting.end_time.toDate() : new Date(meeting.end_time);
      const durationMinutes = (end - start) / (1000 * 60);
      return Math.ceil(durationMinutes / 15); // Number of 15-minute slots
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
      return `${formatTime12h(start.getHours(), start.getMinutes())} - ${formatTime12h(end.getHours(), end.getMinutes())}`;
    };
    
    const handleTimeSlotClick = (day, hour, minute) => {
      if (showAddMeetingForm) return;
      onSelectTimeSlot({ day, hour, minute });
      onAddMeeting();
    };
    
    const handleMeetingClick = (meeting, index) => {
      if (meeting.is_locked) return;
      onEditMeeting(meeting, index);
    };
    
    // Track which meetings we've already rendered to avoid duplicates
    const renderedMeetings = new Set();
    
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
          padding: '15px 20px',
          borderBottom: '2px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8f9fa',
        }}>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              color: '#2c3e50',
              fontWeight: '600'
            }}>Agenda - {agenda.speaker_name}</h3>
            <p style={{fontSize: '12px', color: '#666', margin: '4px 0 0 0'}}>
              {formatDate(seminarDate)}
            </p>
          </div>
          <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
            <div style={{position: 'relative'}}>
              <button 
                onClick={() => setShareMenuOpen(!shareMenuOpen)}
                style={{
                  padding: '6px 10px',
                  backgroundColor: '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Send size={14} />
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
                  minWidth: '180px'
                }}>
                  <button
                    onClick={() => {
                      generateICalFile();
                      setShareMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: '12px',
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
                      padding: '8px 12px',
                      textAlign: 'left',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: '12px'
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
              <X size={20} />
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
            {timeSlots.map((slot, timeIdx) => {
              const isHourMark = slot.minute === 0;
              
              return (
                <React.Fragment key={timeIdx}>
                  {/* Time label - only show on hour marks */}
                  <div style={{
                    ...styles.timeSlotLabel,
                    fontSize: isHourMark ? '11px' : '9px',
                    color: isHourMark ? '#666' : '#999',
                    fontWeight: isHourMark ? '600' : '400'
                  }}>
                    {isHourMark ? formatTime12h(slot.hour, slot.minute) : ''}
                  </div>
                  
                  {/* Day cells */}
                  {days.map((day, dayIdx) => {
                    const meetings = getMeetingsForSlot(day, slot.hour, slot.minute);
                    const isClickable = currentUser.role === 'Organizer' || agenda.host === currentUser.full_name;
                    
                    // Check if this is the first slot of any meeting
                    const meetingsStartingHere = meetings.filter(meeting => {
                      const meetingStart = meeting.start_time?.toDate ? meeting.start_time.toDate() : new Date(meeting.start_time);
                      return meetingStart.getHours() === slot.hour && meetingStart.getMinutes() === slot.minute;
                    });
                    
                    return (
                      <div
                        key={dayIdx}
                        style={{
                          ...styles.timeSlotCell,
                          minHeight: '30px',
                          backgroundColor: isClickable && meetings.length === 0 ? 'transparent' : meetings.length > 0 ? 'transparent' : '#f9f9f9',
                          cursor: isClickable && meetings.length === 0 ? 'pointer' : 'default',
                          position: 'relative'
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
                        onClick={() => isClickable && meetings.length === 0 && handleTimeSlotClick(day, slot.hour, slot.minute)}
                      >
                        {meetingsStartingHere.map((meeting, meetingIdx) => {
                          const meetingKey = `${day.toDateString()}-${meeting.title}-${meeting.start_time}`;
                          if (renderedMeetings.has(meetingKey)) return null;
                          renderedMeetings.add(meetingKey);
                          
                          const span = getMeetingSpan(meeting);
                          const globalIndex = (agenda.meetings || []).indexOf(meeting);
                          
                          return (
                            <div
                              key={meetingIdx}
                              style={{
                                ...styles.calendarMeeting,
                                backgroundColor: getMeetingColor(meeting.type),
                                height: `${span * 30 - 4}px`,
                                cursor: meeting.is_locked ? 'default' : 'pointer'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!meeting.is_locked && isClickable) {
                                  handleMeetingClick(meeting, globalIndex);
                                }
                              }}
                            >
                              <div style={styles.calendarMeetingTitle}>
                                {meeting.title}
                              </div>
                              <div style={styles.calendarMeetingTime}>
                                {formatTimeSlot(meeting)}
                              </div>
                              {meeting.location && (
                                <div style={{fontSize: '9px', marginTop: '2px'}}>
                                  📍 {meeting.location}
                                </div>
                              )}
                              {!meeting.is_locked && isClickable && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteMeeting(globalIndex);
                                  }}
                                  style={styles.deleteMeetingBtn}
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>
  
        {/* Agenda info footer */}
        <div style={styles.agendaInfo}>
          <div style={{fontSize: '12px', color: '#666'}}>
            <strong>Host:</strong> {agenda.host} | <strong>Speaker:</strong> {agenda.speaker_email}
          </div>
          {(currentUser.role === 'Organizer' || agenda.host === currentUser.full_name) && (
            <button
              onClick={onAddMeeting}
              style={{
                marginTop: '8px',
                padding: '6px 10px',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                width: '100%'
              }}
            >
              + Add Meeting
            </button>
          )}
        </div>
  
        {/* Add/Edit meeting form overlay */}
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
              padding: '25px',
              borderRadius: '8px',
              width: '90%',
              maxWidth: '450px',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}>
              <AddMeetingFormInline
                onSubmit={onSubmitMeeting}
                onCancel={onCancelMeeting}
                selectedTimeSlot={selectedTimeSlot}
                seminarDate={seminarDate}
                editingMeeting={editingMeeting}
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
    function AddMeetingFormInline({ onSubmit, onCancel, selectedTimeSlot, seminarDate, editingMeeting }) {
    // If editing, use meeting data; otherwise use selectedTimeSlot or defaults
    const initialDate = editingMeeting 
      ? (editingMeeting.date?.toDate ? editingMeeting.date.toDate() : new Date(editingMeeting.date)).toISOString().split('T')[0]
      : selectedTimeSlot?.day 
        ? selectedTimeSlot.day.toISOString().split('T')[0]
        : seminarDate.toISOString().split('T')[0];
    
    const getInitialTime = (timeObj) => {
      if (editingMeeting && timeObj) {
        const date = timeObj.toDate ? timeObj.toDate() : new Date(timeObj);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
      if (selectedTimeSlot) {
        return `${selectedTimeSlot.hour.toString().padStart(2, '0')}:${selectedTimeSlot.minute.toString().padStart(2, '0')}`;
      }
      return '10:00';
    };
    
    const initialStartTime = editingMeeting 
      ? getInitialTime(editingMeeting.start_time)
      : getInitialTime();
    
    // Calculate end time (30 minutes after start)
    const calculateEndTime = (startTime) => {
      const [hours, minutes] = startTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + 30;
      const endHours = Math.floor(totalMinutes / 60);
      const endMinutes = totalMinutes % 60;
      return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    };
    
    const initialEndTime = editingMeeting
      ? getInitialTime(editingMeeting.end_time)
      : calculateEndTime(initialStartTime);
    
    const [form, setForm] = useState({ 
      title: editingMeeting?.title || '', 
      type: editingMeeting?.type || 'meeting', 
      date: initialDate, 
      start_time: initialStartTime, 
      end_time: initialEndTime, 
      location: editingMeeting?.location || '', 
      attendees: editingMeeting?.attendees?.join(', ') || '', 
      notes: editingMeeting?.notes || '' 
    });
    
    const submit = (e) => { 
      e.preventDefault(); 
      onSubmit(form); 
    };
    
    // Generate time options in 15-minute intervals
    const timeOptions = [];
    for (let hour = 8; hour <= 20; hour++) {
      [0, 15, 30, 45].forEach(minute => {
        if (hour === 20 && minute > 0) return; // Stop at 8:00 PM
        const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const period = hour >= 12 ? 'PM' : 'AM';
        const time12 = `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
        timeOptions.push({ value: time24, label: time12 });
      });
    }
    
    return (
      <form onSubmit={submit} className="space-y-3">
        <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '12px'}}>
          {editingMeeting ? 'Edit Meeting' : 'Add Meeting'}
        </h3>
        
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
            <select
              className="w-full border rounded px-3 py-2 text-sm"
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
            >
              {timeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End *</label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.end_time}
              onChange={e => setForm({ ...form, end_time: e.target.value })}
              required
            >
              {timeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
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
          <button type="submit" className="px-4 py-2 bg-primary text-white rounded">
            {editingMeeting ? 'Update Meeting' : 'Save Meeting'}
          </button>
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
  const [form, setForm] = useState({ date: '', type: 'available', host: '', notes: '' });
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
            <label className="text-sm block mb-2">Type *</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="available"
                  checked={form.type === 'available'}
                  onChange={(e) => setForm({ ...form, type: 'available' })}
                />
                <span className="text-green-600 font-medium">Available</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="conflicting"
                  checked={form.type === 'conflicting'}
                  onChange={(e) => setForm({ ...form, type: 'conflicting' })}
                />
                <span className="text-orange-600 font-medium">Conflicting/Unavailable</span>
              </label>
            </div>
          </div>
          <div>
            <label className="text-sm block mb-1">Host (optional)</label>
            <input className="w-full border rounded px-3 py-2" placeholder="Enter host name" value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Notes (optional)</label>
            <textarea className="w-full border rounded px-3 py-2 min-h-[80px]" placeholder="Location, reason for conflict, etc." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
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

function AddSpeakerForm({ onSubmit, onCancel, seniorFellows, currentUser, countries, availableDates, userAvailability, formatDate }) {
  const [form, setForm] = useState({ 
    full_name: '', 
    email: '', 
    affiliation: '', 
    country: '', 
    area_of_expertise: '', 
    ranking: 'Medium Priority', 
    notes: '', 
    host: currentUser?.full_name || '',
    preferred_date: ''
  });
  
  const [showDateInfo, setShowDateInfo] = useState(false);
  
  const submit = (e) => { e.preventDefault(); onSubmit(form); };
  
  // Get available dates for selected host
  const getAvailableDatesForHost = (hostName) => {
    if (!hostName) return [];
    
    const hostFellow = seniorFellows.find(f => f.full_name === hostName);
    if (!hostFellow) return availableDates.filter(d => d.available && d.locked_by_id !== 'DELETED');
    
    return availableDates.filter(d => {
      if (!d.available || d.locked_by_id === 'DELETED') return false;
      
      // Check if host is unavailable for this date
      const hostUnavailable = userAvailability.find(ua => 
        ua.user_id === hostFellow.id && 
        ua.date_id === d.id && 
        ua.available === false
      );
      
      return !hostUnavailable;
    }).sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateA - dateB;
    });
  };
  
  // Get available fellows for a selected date
  const getAvailableFellowsForDate = (dateId) => {
    if (!dateId) return [];
    
    return seniorFellows.filter(fellow => {
      const unavailability = userAvailability.find(ua => 
        ua.user_id === fellow.id && 
        ua.date_id === dateId && 
        ua.available === false
      );
      return !unavailability;
    });
  };
  
  const availableDatesForHost = getAvailableDatesForHost(form.host);
  const availableFellowsForDate = form.preferred_date ? getAvailableFellowsForDate(form.preferred_date) : [];
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
            <label className="text-sm block mb-1">Notes</label>
            <textarea className="w-full border rounded px-3 py-2 min-h-[60px]" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value})} placeholder="Optional notes about why this speaker should be invited" />
          </div>
          <div>
            <label className="text-sm block mb-1">Host *</label>
            <select 
              required 
              className="w-full border rounded px-3 py-2" 
              value={form.host} 
              onChange={e => {
                setForm({ ...form, host: e.target.value, preferred_date: '' });
                setShowDateInfo(false);
              }}
            >
              <option value="">-- Select Host --</option>
              {seniorFellows.map(f => <option key={f.id} value={f.full_name}>{f.full_name} ({f.role})</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm block mb-1">Preferred Date (optional)</label>
            <select 
              className="w-full border rounded px-3 py-2" 
              value={form.preferred_date} 
              onChange={e => {
                setForm({ ...form, preferred_date: e.target.value });
                setShowDateInfo(!!e.target.value);
              }}
              disabled={!form.host}
            >
              <option value="">-- Select Date --</option>
              {availableDatesForHost.map(d => (
                <option key={d.id} value={d.id}>
                  {formatDate(d.date)} {d.notes ? `(${d.notes})` : ''}
                </option>
              ))}
            </select>
            {form.host && availableDatesForHost.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">⚠️ No available dates for this host</p>
            )}
          </div>
          
          {/* Show available fellows for selected date */}
          {showDateInfo && availableFellowsForDate.length > 0 && (
            <div className="col-span-2 p-3 bg-green-50 border border-green-200 rounded">
              <div className="font-semibold text-green-800 mb-2 text-sm">
                ✓ {availableFellowsForDate.length} Fellow{availableFellowsForDate.length !== 1 ? 's' : ''} Available on This Date
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-green-700">
                {availableFellowsForDate.map(f => (
                  <div key={f.id}>• {f.full_name}</div>
                ))}
              </div>
            </div>
          )}
          
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
  function EditConfirmedSpeakerForm({ speaker, availableDates, onSubmit, onDelete, onCancel, formatDate, seniorFellows, userAvailability }) {
    const currentLockedDate = availableDates.find(d => d.locked_by_id === speaker.id);
    const [form, setForm] = useState({
      talk_title: speaker.talk_title || '',
      talk_abstract: speaker.talk_abstract || '',
      host: speaker.host || '',
      host_type: speaker.host ? 'fellow' : 'other',
      custom_host: '',
      assigned_date: speaker.assigned_date ? (speaker.assigned_date.toDate ? speaker.assigned_date.toDate().toISOString().split('T')[0] : new Date(speaker.assigned_date).toISOString().split('T')[0]) : '',
      current_date_id: currentLockedDate?.id || null,
      new_date_id: currentLockedDate?.id || null,
      old_date_id: currentLockedDate?.id || null
    });
  
    const submit = (e) => { 
      e.preventDefault(); 
      const finalForm = {
        ...form,
        host: form.host_type === 'other' ? form.custom_host : form.host
      };
      onSubmit(finalForm); 
    };
  
    // Filter dates: available OR current locked date
    const selectableDates = availableDates.filter(d => 
      (d.available || d.id === currentLockedDate?.id) && d.locked_by_id !== 'DELETED'
    );
    
    // Get available hosts for the selected date (fellows who are NOT unavailable)
    const getAvailableHosts = (dateId) => {
      if (!dateId) return [];
      
      return seniorFellows.filter(fellow => {
        // Check if this fellow is marked as unavailable for this date
        const unavailability = userAvailability.find(ua => 
          ua.user_id === fellow.id && 
          ua.date_id === dateId && 
          ua.available === false
        );
        
        return !unavailability; // Only include if NOT unavailable
      });
    };
    
    const availableHosts = getAvailableHosts(form.new_date_id);
  
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-lg shadow p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
            
            {/* Assigned Date - moved before host for dependency */}
            <div>
              <label className="text-sm block mb-1">Assigned Date</label>
              <select className="w-full border rounded px-3 py-2" value={form.new_date_id || ''} onChange={(e) => {
                const selectedDateId = e.target.value;
                const selectedDate = availableDates.find(d => d.id === selectedDateId);
                setForm({
                  ...form,
                  new_date_id: selectedDateId,
                  assigned_date: selectedDate?.date ? (selectedDate.date.toDate ? selectedDate.date.toDate().toISOString().split('T')[0] : new Date(selectedDate.date).toISOString().split('T')[0]) : '',
                  host: '', // Reset host when date changes
                  host_type: 'fellow'
                });
              }} required>
                <option value="">-- Select Date --</option>
                {selectableDates.map(d => <option key={d.id} value={d.id}>{formatDate(d.date)} - {d.host || 'TBD'} {d.notes ? `(${d.notes})` : ''}{d.id === currentLockedDate?.id ? ' (Current)' : ''}</option>)}
              </select>
            </div>
            
            {/* Host Selection */}
            <div>
              <label className="text-sm block mb-1">Host</label>
              <select 
                className="w-full border rounded px-3 py-2 mb-2" 
                value={form.host_type} 
                onChange={e => setForm({ ...form, host_type: e.target.value, host: '', custom_host: '' })}
              >
                <option value="fellow">Select from available fellows</option>
                <option value="other">Other (specify)</option>
              </select>
              
              {form.host_type === 'fellow' ? (
                <>
                  <select 
                    className="w-full border rounded px-3 py-2" 
                    value={form.host} 
                    onChange={e => setForm({ ...form, host: e.target.value })} 
                    required
                  >
                    <option value="">-- Select Host --</option>
                    {availableHosts.map(f => (
                      <option key={f.id} value={f.full_name}>
                        {f.full_name} ({f.role})
                      </option>
                    ))}
                  </select>
                  
                  {/* Show available fellows info */}
                  {form.new_date_id && availableHosts.length > 0 && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded text-sm">
                      <div className="font-semibold text-green-800 mb-2">✓ {availableHosts.length} Fellow{availableHosts.length !== 1 ? 's' : ''} Available</div>
                      <div className="space-y-1 text-xs text-green-700">
                        {availableHosts.slice(0, 5).map(f => (
                          <div key={f.id}>• {f.full_name}</div>
                        ))}
                        {availableHosts.length > 5 && (
                          <div className="italic">+ {availableHosts.length - 5} more...</div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {form.new_date_id && availableHosts.length === 0 && (
                    <p className="text-xs text-amber-600 mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                      ⚠️ No fellows are available on this date. Consider using "Other" option or choosing a different date.
                    </p>
                  )}
                </>
              ) : (
                <input 
                  className="w-full border rounded px-3 py-2" 
                  placeholder="Enter host name" 
                  value={form.custom_host} 
                  onChange={e => setForm({ ...form, custom_host: e.target.value })} 
                  required
                />
              )}
            </div>
  
            <div className="flex justify-between gap-2 pt-4 border-t">
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