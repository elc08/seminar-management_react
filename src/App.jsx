import React, { useState, useEffect, useCallback } from 'react';
import { getData as getCountryData } from 'country-list';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
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
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { X, CheckCircle, Mail, Plane, Send } from 'lucide-react';

// Get all countries and organize them
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

const App = () => {
  // Auth & User State
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Data State
  const [speakers, setSpeakers] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [seniorFellows, setSeniorFellows] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [agendas, setAgendas] = useState([]);

  // Form State
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

  // Sidebar State
  const [sidebarSpeaker, setSidebarSpeaker] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showAgendaSidebar, setShowAgendaSidebar] = useState(false);
  const [selectedAgenda, setSelectedAgenda] = useState(null);
  const [showAddMeetingForm, setShowAddMeetingForm] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [showPosterSidebar, setShowPosterSidebar] = useState(false);
  const [posterSpeaker, setPosterSpeaker] = useState(null);

  // Speaker Token Access
  const [speakerAccess, setSpeakerAccess] = useState(null);
  
  // Signup Token Access
  const [signupInvitation, setSignupInvitation] = useState(null);
  const [loadingSignup, setLoadingSignup] = useState(false);

  // Load data functions
  const loadSpeakers = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'speakers'));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSpeakers(data);
    } catch (error) {
      console.error('Error loading speakers:', error);
    }
  }, []);

  const loadAvailableDates = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'available_dates'), orderBy('date', 'asc'))
      );
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAvailableDates(data);
    } catch (error) {
      console.error('Error loading dates:', error);
    }
  }, []);

  const loadInvitations = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'invitations'));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInvitations(data);
    } catch (error) {
      console.error('Error loading invitations:', error);
    }
  }, []);

  const loadSeniorFellows = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'user_roles'), where('role', 'in', ['Senior Fellow', 'Organizer']))
      );
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSeniorFellows(data);
    } catch (error) {
      console.error('Error loading senior fellows:', error);
    }
  }, []);

  const loadAllUsers = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'user_roles'));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllUsers(data);
    } catch (error) {
      console.error('Error loading all users:', error);
    }
  }, []);

  const loadAgendas = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'agendas'), orderBy('seminar_date', 'desc'))
      );
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAgendas(data);
    } catch (error) {
      console.error('Error loading agendas:', error);
    }
  }, []);

  const loadData = useCallback(async () => {
    await Promise.all([
      loadSpeakers(),
      loadAvailableDates(),
      loadInvitations(),
      loadSeniorFellows(),
      loadAllUsers(),
      loadAgendas()
    ]);
  }, [loadSpeakers, loadAvailableDates, loadInvitations, loadSeniorFellows, loadAllUsers, loadAgendas]);

  const loadSpeakerByToken = useCallback(async (token) => {
    try {
      const speakersRef = collection(db, 'speakers');
      const q = query(speakersRef, where('access_token', '==', token));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const speakerDoc = querySnapshot.docs[0];
        setSpeakerAccess({ id: speakerDoc.id, ...speakerDoc.data() });
        await loadAvailableDates();
      } else {
        alert('Invalid or expired invitation link');
      }
    } catch (error) {
      console.error('Error loading speaker:', error);
    }
  }, [loadAvailableDates]);

  const loadUserRole = useCallback(async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'user_roles', uid));
      if (userDoc.exists()) {
        setUserRole({ id: uid, ...userDoc.data() });
        await loadData();
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  }, [loadData]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      loadSpeakerByToken(token);
    }
  }, [loadSpeakerByToken]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const signupToken = urlParams.get('signup');
    if (signupToken && !user) {
      setLoadingSignup(true);
      const loadSignupInvitation = async () => {
        try {
          const invitationsRef = collection(db, 'invitations');
          const q = query(invitationsRef, where('token', '==', signupToken), where('used', '==', false));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const invDoc = querySnapshot.docs[0];
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
          setLoadingSignup(false);
        } catch (error) {
          console.error('Error loading invitation:', error);
          alert('Error loading invitation. Please try again.');
          setLoadingSignup(false);
        }
      };
      loadSignupInvitation();
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await loadUserRole(currentUser.uid);
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [loadUserRole]);

  const handleLogin = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert('Login failed: ' + error.message);
    }
  };

  const handleSignup = async (password) => {
    if (!signupInvitation) return;
    
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        signupInvitation.email, 
        password
      );
      
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
      
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        alert('An account with this email already exists. Please login instead.');
      } else {
        alert('Signup failed: ' + error.message);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleAddDate = async (formData) => {
    try {
      const newDate = new Date(formData.date);
      const newDateString = newDate.toISOString().split('T')[0];
      
      const duplicateDate = availableDates.find(d => {
        if (d.locked_by_id === 'DELETED') return false;
        const existingDate = d.date.toDate ? d.date.toDate() : new Date(d.date);
        const existingDateString = existingDate.toISOString().split('T')[0];
        return existingDateString === newDateString;
      });
      
      if (duplicateDate) {
        alert(`This date (${formatDate(duplicateDate.date)}) already exists in the system. Please choose a different date.`);
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
    } catch (error) {
      alert('Error adding date: ' + error.message);
    }
  };

  const handleDeleteDate = async (dateId) => {
    const date = availableDates.find(d => d.id === dateId);
    if (date && !date.available) {
      alert('Cannot delete a date that is locked by a speaker.');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this date?')) {
      try {
        const dateRef = doc(db, 'available_dates', dateId);
        await updateDoc(dateRef, {
          available: false,
          locked_by_id: 'DELETED'
        });
        await loadAvailableDates();
      } catch (error) {
        alert('Error deleting date: ' + error.message);
      }
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
        createdAt: serverTimestamp()
      });
      await loadSpeakers();
      setShowAddSpeakerForm(false);
    } catch (error) {
      alert('Error adding speaker: ' + error.message);
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
        createdAt: serverTimestamp()
      });
      await loadSpeakers();
      setShowAddPastSpeakerForm(false);
      alert('Past speaker added successfully!');
    } catch (error) {
      alert('Error adding past speaker: ' + error.message);
    }
  };

  const handleDeleteSpeaker = async (speakerId) => {
    if (window.confirm('Are you sure you want to delete this speaker proposal?')) {
      try {
        await deleteDoc(doc(db, 'speakers', speakerId));
        await loadSpeakers();
        alert('Speaker deleted successfully!');
      } catch (error) {
        alert('Error deleting speaker: ' + error.message);
      }
    }
  };

  const handleAcceptSpeaker = async (speakerId) => {
    try {
      const speaker = speakers.find(s => s.id === speakerId);
      const token = speaker.access_token || generateToken();
      
      const actions = speaker.actions || [];
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
        actions: actions
      });
      
      await loadSpeakers();
      
      // Open sidebar instead of email
      const updatedSpeaker = { ...speaker, status: 'Invited', access_token: token, actions };
      setSidebarSpeaker(updatedSpeaker);
      setShowSidebar(true);
    } catch (error) {
      alert('Error accepting speaker: ' + error.message);
    }
  };

  const handleResendInvitation = async (speaker) => {
    try {
      // Reset invitation timestamps
      await updateDoc(doc(db, 'speakers', speaker.id), {
        invitation_sent_date: serverTimestamp(),
        response_deadline: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
      });
      
      await loadSpeakers();
      
      // Update the speaker object with new timestamps
      const updatedSpeaker = {
        ...speaker,
        invitation_sent_date: Timestamp.now(),
        response_deadline: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
      };
      
      setSidebarSpeaker(updatedSpeaker);
      setShowSidebar(true);
    } catch (error) {
      alert('Error resending invitation: ' + error.message);
    }
  };

  const handleRejectSpeaker = async (speakerId) => {
    if (window.confirm('Are you sure you want to reject this speaker?')) {
      try {
        await updateDoc(doc(db, 'speakers', speakerId), {
          status: 'Declined'
        });
        await loadSpeakers();
      } catch (error) {
        alert('Error rejecting speaker: ' + error.message);
      }
    }
  };

  const handleUpdateAction = async (speakerId, actionIndex, completed) => {
    try {
      const speaker = speakers.find(s => s.id === speakerId);
      const actions = [...(speaker.actions || [])];
      actions[actionIndex].completed = completed;
      actions[actionIndex].completedAt = completed ? new Date().toISOString() : null;
      
      await updateDoc(doc(db, 'speakers', speakerId), { actions });
      await loadSpeakers();
      
      if (sidebarSpeaker && sidebarSpeaker.id === speakerId) {
        setSidebarSpeaker({ ...sidebarSpeaker, actions });
      }
    } catch (error) {
      alert('Error updating action: ' + error.message);
    }
  };

  const handleAddManualAction = async (speakerId, actionType) => {
    try {
      const speaker = speakers.find(s => s.id === speakerId);
      const actions = [...(speaker.actions || [])];
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
    } catch (error) {
      alert('Error adding action: ' + error.message);
    }
  };

  const handleEditSpeaker = async (formData) => {
    try {
      await updateDoc(doc(db, 'speakers', editingSpeaker.id), formData);
      await loadSpeakers();
      setShowEditSpeakerForm(false);
      setEditingSpeaker(null);
    } catch (error) {
      alert('Error updating speaker: ' + error.message);
    }
  };

  const handleEditConfirmedSpeaker = async (formData) => {
    try {
      const updateData = {
        ...formData,
        assigned_date: formData.assigned_date ? Timestamp.fromDate(new Date(formData.assigned_date)) : null
      };
      
      await updateDoc(doc(db, 'speakers', editingSpeaker.id), updateData);
      
      if (formData.old_date_id && formData.new_date_id && formData.old_date_id !== formData.new_date_id) {
        await updateDoc(doc(db, 'available_dates', formData.old_date_id), {
          available: true,
          locked_by_id: null,
          talk_title: ''
        });
        
        await updateDoc(doc(db, 'available_dates', formData.new_date_id), {
          available: false,
          locked_by_id: editingSpeaker.id,
          talk_title: formData.talk_title
        });
      } else if (formData.current_date_id) {
        await updateDoc(doc(db, 'available_dates', formData.current_date_id), {
          talk_title: formData.talk_title
        });
      }
      
      await loadSpeakers();
      await loadAvailableDates();
      setShowEditConfirmedForm(false);
      setEditingSpeaker(null);
    } catch (error) {
      alert('Error updating confirmed speaker: ' + error.message);
    }
  };

  const handleDeleteConfirmedSpeaker = async (speakerId) => {
    if (!window.confirm('Are you sure you want to delete this confirmed speaker? This will also delete their agenda and free up their assigned date.')) {
      return;
    }

    try {
      // Find and delete the associated agenda
      const speakerAgenda = agendas.find(a => a.speaker_id === speakerId);
      if (speakerAgenda) {
        await deleteDoc(doc(db, 'agendas', speakerAgenda.id));
      }
      
      // Unlock the date if one was assigned
      const lockedDate = availableDates.find(d => d.locked_by_id === speakerId);
      if (lockedDate) {
        await updateDoc(doc(db, 'available_dates', lockedDate.id), {
          available: true,
          locked_by_id: null,
          talk_title: ''
        });
      }
      
      // Delete the speaker
      await deleteDoc(doc(db, 'speakers', speakerId));
      
      await loadSpeakers();
      await loadAvailableDates();
      await loadAgendas();
      setShowEditConfirmedForm(false);
      setEditingSpeaker(null);
      
      alert('Speaker deleted successfully!');
    } catch (error) {
      alert('Error deleting speaker: ' + error.message);
    }
  };

  const handleDeleteInvitedSpeaker = async (speakerId) => {
    if (!window.confirm('Are you sure you want to delete this invited speaker? This will cancel their invitation.')) {
      return;
    }

    try {
      // Delete the speaker
      await deleteDoc(doc(db, 'speakers', speakerId));
      
      await loadSpeakers();
      alert('Invited speaker deleted successfully!');
    } catch (error) {
      alert('Error deleting speaker: ' + error.message);
    }
  };

  const handleSpeakerAccept = async (dateId, talkTitle, talkAbstract) => {
    try {
      await updateDoc(doc(db, 'available_dates', dateId), {
        available: false,
        locked_by_id: speakerAccess.id,
        talk_title: talkTitle
      });

      const selectedDate = availableDates.find(d => d.id === dateId);
      
      const actions = speakerAccess.actions || [];
      
      // Add speaker responded action
      actions.push({
        type: 'speaker_responded',
        timestamp: new Date().toISOString(),
        completed: true,
        user: speakerAccess.full_name,
        action: 'accepted'
      });

      // Add travel arrangements action
      actions.push({
        type: 'travel_arrangements',
        timestamp: new Date().toISOString(),
        completed: false,
        user: speakerAccess.full_name
      });

      await updateDoc(doc(db, 'speakers', speakerAccess.id), {
        status: 'Accepted',
        assigned_date: selectedDate.date,
        talk_title: talkTitle,
        talk_abstract: talkAbstract || '',
        actions: actions
      });

      // Create agenda for the visit with seminar talk
      const visitDate = selectedDate.date.toDate();
      const dayBefore = new Date(visitDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const dayAfter = new Date(visitDate);
      dayAfter.setDate(dayAfter.getDate() + 1);

      // Create the seminar talk event (10-11am on seminar date)
      const seminarStartTime = new Date(visitDate);
      seminarStartTime.setHours(10, 0, 0, 0);
      const seminarEndTime = new Date(visitDate);
      seminarEndTime.setHours(11, 0, 0, 0);

      const seminarEvent = {
        title: talkTitle,
        type: 'seminar',
        date: Timestamp.fromDate(visitDate),
        start_time: Timestamp.fromDate(seminarStartTime),
        end_time: Timestamp.fromDate(seminarEndTime),
        location: selectedDate.notes || 'TBD',
        notes: 'Main seminar presentation',
        attendees: [],
        is_locked: true // Can't be edited or deleted
      };

      // Create lunch slot (1-2pm on seminar date)
      const lunchStartTime = new Date(visitDate);
      lunchStartTime.setHours(13, 0, 0, 0);
      const lunchEndTime = new Date(visitDate);
      lunchEndTime.setHours(14, 0, 0, 0);

      const lunchEvent = {
        title: 'Lunch',
        type: 'social',
        date: Timestamp.fromDate(visitDate),
        start_time: Timestamp.fromDate(lunchStartTime),
        end_time: Timestamp.fromDate(lunchEndTime),
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

      alert('Thank you! Your presentation has been scheduled. The organizers will contact you shortly regarding travel arrangements and to coordinate meetings.');
      
      await loadAvailableDates();
      await loadAgendas();
      setSpeakerAccess({ ...speakerAccess, status: 'Accepted', actions });
    } catch (error) {
      console.error('Error accepting invitation:', error);
      alert('Error accepting invitation: ' + error.message);
    }
  };

  const handleSpeakerDecline = async () => {
    if (window.confirm('Are you sure you want to decline this invitation?')) {
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
          actions: actions
        });
        
        alert('Your response has been recorded. Thank you for your time.');
        setSpeakerAccess({ ...speakerAccess, status: 'Declined', actions });
      } catch (error) {
        console.error('Error declining invitation:', error);
        alert('Error declining invitation: ' + error.message);
      }
    }
  };

  const generateToken = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

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

      const mailtoLink = `mailto:${formData.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      window.location.href = mailtoLink;

      await loadInvitations();
      setShowInviteUserForm(false);
      alert('Invitation created! Your email client should open with a draft email.');
    } catch (error) {
      alert('Error creating invitation: ' + error.message);
    }
  };

  const handleEditUser = async (formData) => {
    try {
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
    } catch (error) {
      alert('Error updating user: ' + error.message);
    }
  };

  const handleEditOwnProfile = async (formData) => {
    try {
      // Update Firestore data
      await updateDoc(doc(db, 'user_roles', user.uid), {
        full_name: formData.full_name,
        affiliation: formData.affiliation
      });
      
      // Update local state
      setUserRole({
        ...userRole,
        full_name: formData.full_name,
        affiliation: formData.affiliation
      });
      
      await loadAllUsers();
      await loadSeniorFellows();
      setShowEditProfileForm(false);
      alert('Profile updated successfully!');
    } catch (error) {
      alert('Error updating profile: ' + error.message);
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (userId === user.uid) {
      alert('You cannot delete your own account!');
      return;
    }

    if (window.confirm(`Are you sure you want to remove ${userEmail} from the system?`)) {
      try {
        await deleteDoc(doc(db, 'user_roles', userId));
        await loadAllUsers();
        await loadSeniorFellows();
        alert('User removed successfully!');
      } catch (error) {
        alert('Error removing user: ' + error.message);
      }
    }
  };

  const handlePasswordReset = async (email) => {
    if (window.confirm(`Send password reset email to ${email}?`)) {
      try {
        await sendPasswordResetEmail(auth, email);
        alert(`Password reset email sent to ${email}.`);
      } catch (error) {
        alert('Error sending password reset email: ' + error.message);
      }
    }
  };

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
      const startTime = new Date(meetingDate);
      const [startHours, startMinutes] = meetingData.start_time.split(':');
      startTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);
      
      const endTime = new Date(meetingDate);
      const [endHours, endMinutes] = meetingData.end_time.split(':');
      endTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

      const newMeeting = {
        title: meetingData.title,
        type: meetingData.type,
        date: Timestamp.fromDate(meetingDate),
        start_time: Timestamp.fromDate(startTime),
        end_time: Timestamp.fromDate(endTime),
        location: meetingData.location || '',
        attendees: meetingData.attendees ? meetingData.attendees.split(',').map(a => a.trim()) : [],
        notes: meetingData.notes || '',
        is_locked: false
      };

      meetings.push(newMeeting);

      // Update immediately in local state for instant UI update
      const updatedAgenda = {...agenda, meetings};
      setSelectedAgenda(updatedAgenda);
      setShowAddMeetingForm(false);
      setSelectedTimeSlot(null);

      // Then update Firebase in the background
      await updateDoc(doc(db, 'agendas', agenda.id), { meetings });
      await loadAgendas();
    } catch (error) {
      alert('Error adding meeting: ' + error.message);
      // Reload to get correct state if there was an error
      await loadAgendas();
      const originalAgenda = agendas.find(a => a.id === selectedAgenda.id);
      if (originalAgenda) {
        setSelectedAgenda(originalAgenda);
      }
    }
  };

  const handleDeleteMeeting = async (meetingIndex) => {
    if (window.confirm('Are you sure you want to delete this meeting?')) {
      try {
        const agenda = selectedAgenda;
        const meetings = [...(agenda.meetings || [])];
        
        if (meetings[meetingIndex].is_locked) {
          alert('Cannot delete the main seminar presentation.');
          return;
        }
        
        meetings.splice(meetingIndex, 1);
        
        // Update immediately in local state for instant UI update
        const updatedAgenda = {...agenda, meetings};
        setSelectedAgenda(updatedAgenda);
        
        // Then update Firebase in the background
        await updateDoc(doc(db, 'agendas', agenda.id), { meetings });
        await loadAgendas();
      } catch (error) {
        alert('Error deleting meeting: ' + error.message);
        // Reload to get correct state if there was an error
        await loadAgendas();
        const originalAgenda = agendas.find(a => a.id === selectedAgenda.id);
        if (originalAgenda) {
          setSelectedAgenda(originalAgenda);
        }
      }
    }
  };

  const getRankingColor = (ranking) => {
    switch (ranking) {
      case 'High Priority': return '#ff4444';
      case 'Medium Priority': return '#ffaa00';
      case 'Low Priority': return '#44ff44';
      default: return '#999';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Proposed': return '#999';
      case 'Invited': return '#0088ff';
      case 'Accepted': return '#00cc00';
      case 'Declined': return '#ff4444';
      default: return '#999';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if ((loading || loadingSignup) && !signupInvitation) {
    return <div style={styles.loading}>Loading...</div>;
  }

  if (signupInvitation && !user) {
    return <SignupView invitation={signupInvitation} onSignup={handleSignup} />;
  }

  if (speakerAccess) {
    return <SpeakerAccessView 
      speaker={speakerAccess}
      availableDates={availableDates}
      onAccept={handleSpeakerAccept}
      onDecline={handleSpeakerDecline}
      formatDate={formatDate}
    />;
  }

  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }

  if (user && !userRole) {
    return <div style={styles.loading}>Loading user data...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Seminar Management System</h1>
        <div style={styles.userInfo}>
          <span style={styles.userName}>{userRole?.full_name} ({userRole?.role})</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      <div style={styles.nav}>
        <button 
          onClick={() => setActiveTab('dashboard')} 
          style={{...styles.navBtn, ...(activeTab === 'dashboard' ? styles.navBtnActive : {})}}>
          Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('statistics')} 
          style={{...styles.navBtn, ...(activeTab === 'statistics' ? styles.navBtnActive : {})}}>
          Past Speakers
        </button>
        {userRole?.role === 'Organizer' && (
          <>
            <button 
              onClick={() => setActiveTab('dates')} 
              style={{...styles.navBtn, ...(activeTab === 'dates' ? styles.navBtnActive : {})}}>
              Available Dates
            </button>
            <button 
              onClick={() => setActiveTab('propose')} 
              style={{...styles.navBtn, ...(activeTab === 'propose' ? styles.navBtnActive : {})}}>
              Propose Speaker
            </button>
            <button 
              onClick={() => setActiveTab('users')} 
              style={{...styles.navBtn, ...(activeTab === 'users' ? styles.navBtnActive : {})}}>
              Manage Users
            </button>
            <button 
              onClick={() => setActiveTab('invitations')} 
              style={{...styles.navBtn, ...(activeTab === 'invitations' ? styles.navBtnActive : {})}}>
              User Invitations
            </button>
          </>
        )}
        {userRole?.role === 'Senior Fellow' && (
          <button 
            onClick={() => setActiveTab('propose')} 
            style={{...styles.navBtn, ...(activeTab === 'propose' ? styles.navBtnActive : {})}}>
            Propose Speaker
          </button>
        )}
        <button 
          onClick={() => setActiveTab('profile')} 
          style={{...styles.navBtn, ...(activeTab === 'profile' ? styles.navBtnActive : {})}}>
          My Profile
        </button>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.content}>
          {activeTab === 'dashboard' && (
            <DashboardView 
              userRole={userRole}
              speakers={speakers}
              availableDates={availableDates}
              onAcceptSpeaker={handleAcceptSpeaker}
              onRejectSpeaker={handleRejectSpeaker}
              onResendInvitation={handleResendInvitation}
              onEditSpeaker={(speaker) => {
                setEditingSpeaker(speaker);
                setShowEditSpeakerForm(true);
              }}
              onEditConfirmed={(speaker) => {
                setEditingSpeaker(speaker);
                setShowEditConfirmedForm(true);
              }}
              onViewActions={(speaker) => {
                setSidebarSpeaker(speaker);
                setShowSidebar(true);
              }}
              onViewAgenda={handleViewAgenda}
              onGeneratePoster={handleGeneratePoster}
              onDeleteInvited={handleDeleteInvitedSpeaker}
              getRankingColor={getRankingColor}
              getStatusColor={getStatusColor}
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
              onEditUser={(user) => {
                setEditingUser(user);
                setShowEditUserForm(true);
              }}
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
              speakers={speakers.filter(s => s.proposed_by_id === user.uid)}
              onEditSpeaker={(speaker) => {
                setEditingSpeaker(speaker);
                setShowEditSpeakerForm(true);
              }}
              onDeleteSpeaker={handleDeleteSpeaker}
              getRankingColor={getRankingColor}
              getStatusColor={getStatusColor}
              formatDate={formatDate}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView 
              userRole={userRole}
              onEditProfile={() => setShowEditProfileForm(true)}
            />
          )}
        </div>

        {showSidebar && sidebarSpeaker && (
          <ActionsSidebar
            speaker={sidebarSpeaker}
            onClose={() => {
              setShowSidebar(false);
              setSidebarSpeaker(null);
            }}
            onUpdateAction={handleUpdateAction}
            onAddAction={handleAddManualAction}
            currentUser={userRole}
            formatDate={formatDate}
          />
        )}

        {showAgendaSidebar && selectedAgenda && (
          <AgendaSidebar
            agenda={selectedAgenda}
            onClose={() => {
              setShowAgendaSidebar(false);
              setSelectedAgenda(null);
              setShowAddMeetingForm(false);
              setSelectedTimeSlot(null);
            }}
            onAddMeeting={() => setShowAddMeetingForm(true)}
            onDeleteMeeting={handleDeleteMeeting}
            showAddMeetingForm={showAddMeetingForm}
            onSubmitMeeting={handleAddMeeting}
            onCancelMeeting={() => {
              setShowAddMeetingForm(false);
              setSelectedTimeSlot(null);
            }}
            selectedTimeSlot={selectedTimeSlot}
            onSelectTimeSlot={setSelectedTimeSlot}
            formatDate={formatDate}
            currentUser={userRole}
          />
        )}

        {showPosterSidebar && posterSpeaker && (
          <PosterSidebar
            speaker={posterSpeaker}
            onClose={() => {
              setShowPosterSidebar(false);
              setPosterSpeaker(null);
            }}
            formatDate={formatDate}
            allUsers={allUsers}
          />
        )}
      </div>

      {showAddDateForm && (
        <AddDateForm 
          onSubmit={handleAddDate}
          onCancel={() => setShowAddDateForm(false)}
          existingDates={availableDates}
          formatDate={formatDate}
        />
      )}

      {showAddSpeakerForm && (
        <AddSpeakerForm 
          onSubmit={handleAddSpeaker}
          onCancel={() => setShowAddSpeakerForm(false)}
          seniorFellows={seniorFellows}
          currentUser={userRole}
          countries={COUNTRIES}
        />
      )}

      {showAddPastSpeakerForm && (
        <AddPastSpeakerForm 
          onSubmit={handleAddPastSpeaker}
          onCancel={() => setShowAddPastSpeakerForm(false)}
          seniorFellows={seniorFellows}
          countries={COUNTRIES}
        />
      )}

      {showEditSpeakerForm && editingSpeaker && (
        <EditSpeakerForm 
          speaker={editingSpeaker}
          onSubmit={handleEditSpeaker}
          onCancel={() => {
            setShowEditSpeakerForm(false);
            setEditingSpeaker(null);
          }}
          seniorFellows={seniorFellows}
          countries={COUNTRIES}
        />
      )}

      {showEditConfirmedForm && editingSpeaker && (
        <EditConfirmedSpeakerForm 
          speaker={editingSpeaker}
          availableDates={availableDates}
          onSubmit={handleEditConfirmedSpeaker}
          onDelete={handleDeleteConfirmedSpeaker}
          onCancel={() => {
            setShowEditConfirmedForm(false);
            setEditingSpeaker(null);
          }}
          formatDate={formatDate}
        />
      )}

      {showInviteUserForm && (
        <InviteUserForm 
          onSubmit={handleCreateInvitation}
          onCancel={() => setShowInviteUserForm(false)}
        />
      )}

      {showEditUserForm && editingUser && (
        <EditUserForm 
          user={editingUser}
          onSubmit={handleEditUser}
          onCancel={() => {
            setShowEditUserForm(false);
            setEditingUser(null);
          }}
        />
      )}

      {showEditProfileForm && (
        <EditProfileForm 
          userRole={userRole}
          onSubmit={handleEditOwnProfile}
          onCancel={() => setShowEditProfileForm(false)}
        />
      )}
    </div>
  );
};

// Add Date Form
const AddDateForm = ({ onSubmit, onCancel, existingDates, formatDate }) => {
  const [formData, setFormData] = useState({
    date: '',
    host: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const activeDates = existingDates.filter(d => d.locked_by_id !== 'DELETED');
  const sortedDates = [...activeDates].sort((a, b) => {
    const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
    const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
    return dateA - dateB;
  });

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <h3 style={styles.modalTitle}>Add Available Date</h3>
        
        {activeDates.length > 0 && (
          <div style={styles.existingDatesContainer}>
            <h4 style={styles.existingDatesTitle}>Existing Dates:</h4>
            <div style={styles.existingDatesList}>
              {sortedDates.map(date => (
                <div 
                  key={date.id} 
                  style={{
                    ...styles.existingDateItem,
                    backgroundColor: date.available ? '#d4edda' : '#cce5ff',
                    borderLeft: `4px solid ${date.available ? '#28a745' : '#007bff'}`
                  }}
                >
                  <div style={styles.existingDateInfo}>
                    <strong>{formatDate(date.date)}</strong>
                    <span style={styles.existingDateStatus}>
                      {date.available ? '● Available' : '● Locked'}
                    </span>
                  </div>
                  <div style={styles.existingDateDetails}>
                    {date.talk_title && <span>"{date.talk_title}" - </span>}
                    {date.host && `Host: ${date.host}`}
                    {date.notes && ` (${date.notes})`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Date: *</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Host (optional):</label>
          <input
            type="text"
            value={formData.host}
            onChange={(e) => setFormData({...formData, host: e.target.value})}
            style={styles.input}
            placeholder="Host name (can be set later)"
          />

          <label style={styles.label}>Notes:</label>
          <input
            type="text"
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            style={styles.input}
            placeholder="Room, time, etc."
          />

          <div style={styles.buttonGroup}>
            <button type="submit" style={styles.submitBtn}>Add Date</button>
            <button type="button" onClick={onCancel} style={styles.cancelBtn}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add Speaker Form
const AddSpeakerForm = ({ onSubmit, onCancel, seniorFellows, currentUser, countries }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    affiliation: '',
    country: '',
    area_of_expertise: '',
    ranking: 'Medium Priority',
    notes: '',
    host: currentUser?.full_name || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <h3 style={styles.modalTitle}>Propose Speaker</h3>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Full Name: *</label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Email: *</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Affiliation: *</label>
          <input
            type="text"
            value={formData.affiliation}
            onChange={(e) => setFormData({...formData, affiliation: e.target.value})}
            style={styles.input}
            placeholder="Institution, University, etc."
            required
          />

          <label style={styles.label}>Country of Affiliation: *</label>
          <select
            value={formData.country}
            onChange={(e) => setFormData({...formData, country: e.target.value})}
            style={styles.select}
            required
          >
            <option value="">-- Select Country --</option>
            {countries.map((country, idx) => {
              if (country.startsWith('---')) {
                return <option key={idx} disabled style={{fontWeight: 'bold', backgroundColor: '#f0f0f0'}}>{country}</option>;
              }
              return <option key={idx} value={country}>{country}</option>;
            })}
          </select>

          <label style={styles.label}>Area of Expertise: *</label>
          <input
            type="text"
            value={formData.area_of_expertise}
            onChange={(e) => setFormData({...formData, area_of_expertise: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Priority Ranking:</label>
          <select
            value={formData.ranking}
            onChange={(e) => setFormData({...formData, ranking: e.target.value})}
            style={styles.select}
          >
            <option value="High Priority">High Priority</option>
            <option value="Medium Priority">Medium Priority</option>
            <option value="Low Priority">Low Priority</option>
          </select>

          <label style={styles.label}>Notes:</label>
          <input
            type="text"
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Host: *</label>
          <select
            value={formData.host}
            onChange={(e) => setFormData({...formData, host: e.target.value})}
            style={styles.select}
            required
          >
            <option value="">-- Select Host --</option>
            {seniorFellows.map(fellow => (
              <option key={fellow.id} value={fellow.full_name}>
                {fellow.full_name} ({fellow.role})
              </option>
            ))}
          </select>

          <div style={styles.buttonGroup}>
            <button type="submit" style={styles.submitBtn}>Propose Speaker</button>
            <button type="button" onClick={onCancel} style={styles.cancelBtn}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add Past Speaker Form
const AddPastSpeakerForm = ({ onSubmit, onCancel, seniorFellows, countries }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    affiliation: '',
    country: '',
    area_of_expertise: '',
    host: '',
    assigned_date: '',
    talk_title: '',
    talk_abstract: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <h3 style={styles.modalTitle}>Add Past Speaker</h3>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Full Name: *</label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Email:</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            style={styles.input}
          />

          <label style={styles.label}>Affiliation: *</label>
          <input
            type="text"
            value={formData.affiliation}
            onChange={(e) => setFormData({...formData, affiliation: e.target.value})}
            style={styles.input}
            placeholder="Institution, University, etc."
            required
          />

          <label style={styles.label}>Country of Affiliation: *</label>
          <select
            value={formData.country}
            onChange={(e) => setFormData({...formData, country: e.target.value})}
            style={styles.select}
            required
          >
            <option value="">-- Select Country --</option>
            {countries.map((country, idx) => {
              if (country.startsWith('---')) {
                return <option key={idx} disabled style={{fontWeight: 'bold', backgroundColor: '#f0f0f0'}}>{country}</option>;
              }
              return <option key={idx} value={country}>{country}</option>;
            })}
          </select>

          <label style={styles.label}>Area of Expertise: *</label>
          <input
            type="text"
            value={formData.area_of_expertise}
            onChange={(e) => setFormData({...formData, area_of_expertise: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Host: *</label>
          <select
            value={formData.host}
            onChange={(e) => setFormData({...formData, host: e.target.value})}
            style={styles.select}
            required
          >
            <option value="">-- Select Host --</option>
            {seniorFellows.map(fellow => (
              <option key={fellow.id} value={fellow.full_name}>
                {fellow.full_name} ({fellow.role})
              </option>
            ))}
          </select>

          <label style={styles.label}>Seminar Date: *</label>
          <input
            type="date"
            value={formData.assigned_date}
            onChange={(e) => setFormData({...formData, assigned_date: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Talk Title:</label>
          <input
            type="text"
            value={formData.talk_title}
            onChange={(e) => setFormData({...formData, talk_title: e.target.value})}
            style={styles.input}
            placeholder="Enter talk title"
          />

          <label style={styles.label}>Talk Abstract:</label>
          <textarea
            value={formData.talk_abstract}
            onChange={(e) => setFormData({...formData, talk_abstract: e.target.value})}
            style={{...styles.input, minHeight: '100px', resize: 'vertical'}}
            placeholder="Enter talk abstract"
          />

          <div style={styles.buttonGroup}>
            <button type="submit" style={styles.submitBtn}>Add Past Speaker</button>
            <button type="button" onClick={onCancel} style={styles.cancelBtn}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Speaker Form
const EditSpeakerForm = ({ speaker, onSubmit, onCancel, seniorFellows, countries }) => {
  const [formData, setFormData] = useState({
    full_name: speaker.full_name,
    email: speaker.email,
    affiliation: speaker.affiliation,
    country: speaker.country || '',
    area_of_expertise: speaker.area_of_expertise,
    ranking: speaker.ranking,
    host: speaker.host
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <h3 style={styles.modalTitle}>Edit Speaker</h3>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Full Name:</label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Email:</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Affiliation:</label>
          <input
            type="text"
            value={formData.affiliation}
            onChange={(e) => setFormData({...formData, affiliation: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Country of Affiliation:</label>
          <select
            value={formData.country}
            onChange={(e) => setFormData({...formData, country: e.target.value})}
            style={styles.select}
            required
          >
            <option value="">-- Select Country --</option>
            {countries.map((country, idx) => {
              if (country.startsWith('---')) {
                return <option key={idx} disabled style={{fontWeight: 'bold', backgroundColor: '#f0f0f0'}}>{country}</option>;
              }
              return <option key={idx} value={country}>{country}</option>;
            })}
          </select>

          <label style={styles.label}>Area of Expertise:</label>
          <input
            type="text"
            value={formData.area_of_expertise}
            onChange={(e) => setFormData({...formData, area_of_expertise: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Priority Ranking:</label>
          <select
            value={formData.ranking}
            onChange={(e) => setFormData({...formData, ranking: e.target.value})}
            style={styles.select}
          >
            <option value="High Priority">High Priority</option>
            <option value="Medium Priority">Medium Priority</option>
            <option value="Low Priority">Low Priority</option>
          </select>

          <label style={styles.label}>Host:</label>
          <select
            value={formData.host}
            onChange={(e) => setFormData({...formData, host: e.target.value})}
            style={styles.select}
            required
          >
            <option value="">-- Select Host --</option>
            {seniorFellows.map(fellow => (
              <option key={fellow.id} value={fellow.full_name}>
                {fellow.full_name} ({fellow.role})
              </option>
            ))}
          </select>

          <div style={styles.buttonGroup}>
            <button type="submit" style={styles.submitBtn}>Save Changes</button>
            <button type="button" onClick={onCancel} style={styles.cancelBtn}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Confirmed Speaker Form
const EditConfirmedSpeakerForm = ({ speaker, availableDates, onSubmit, onDelete, onCancel, formatDate }) => {
  const currentLockedDate = availableDates.find(d => d.locked_by_id === speaker.id);
  
  const [formData, setFormData] = useState({
    talk_title: speaker.talk_title || '',
    talk_abstract: speaker.talk_abstract || '',
    host: speaker.host,
    assigned_date: speaker.assigned_date ? 
      (speaker.assigned_date.toDate ? speaker.assigned_date.toDate().toISOString().split('T')[0] : 
       new Date(speaker.assigned_date).toISOString().split('T')[0]) : '',
    current_date_id: currentLockedDate?.id || null,
    new_date_id: currentLockedDate?.id || null,
    old_date_id: currentLockedDate?.id || null
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const selectableDates = availableDates.filter(d => 
    (d.available || d.id === currentLockedDate?.id) && d.locked_by_id !== 'DELETED'
  );

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <h3 style={styles.modalTitle}>Edit Confirmed Speaker</h3>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Talk Title:</label>
          <input
            type="text"
            value={formData.talk_title}
            onChange={(e) => setFormData({...formData, talk_title: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Talk Abstract:</label>
          <textarea
            value={formData.talk_abstract}
            onChange={(e) => setFormData({...formData, talk_abstract: e.target.value})}
            style={{...styles.input, minHeight: '120px', resize: 'vertical'}}
            placeholder="Enter talk abstract..."
          />

          <label style={styles.label}>Host:</label>
          <input
            type="text"
            value={formData.host}
            onChange={(e) => setFormData({...formData, host: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Assigned Date:</label>
          <select
            value={formData.new_date_id || ''}
            onChange={(e) => {
              const selectedDateId = e.target.value;
              const selectedDate = availableDates.find(d => d.id === selectedDateId);
              setFormData({
                ...formData, 
                new_date_id: selectedDateId,
                assigned_date: selectedDate?.date ? 
                  (selectedDate.date.toDate ? selectedDate.date.toDate().toISOString().split('T')[0] : 
                   new Date(selectedDate.date).toISOString().split('T')[0]) : ''
              });
            }}
            style={styles.select}
            required
          >
            <option value="">-- Select Date --</option>
            {selectableDates.map(date => (
              <option key={date.id} value={date.id}>
                {formatDate(date.date)} - {date.host} {date.notes ? `(${date.notes})` : ''} 
                {date.id === currentLockedDate?.id ? ' (Current)' : ''}
              </option>
            ))}
          </select>

          <div style={styles.buttonGroup}>
            <button type="submit" style={styles.submitBtn}>Save Changes</button>
            <button type="button" onClick={onCancel} style={styles.cancelBtn}>Cancel</button>
          </div>
          
          <div style={{marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e0e0e0'}}>
            <button 
              type="button" 
              onClick={() => onDelete(speaker.id)}
              style={{
                ...styles.submitBtn, 
                backgroundColor: '#e74c3c',
                width: '100%'
              }}>
              Delete Speaker
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Invite User Form
const InviteUserForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    affiliation: '',
    role: 'Senior Fellow'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <h3 style={styles.modalTitle}>Create User Invitation</h3>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Email:</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Full Name:</label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Affiliation:</label>
          <input
            type="text"
            value={formData.affiliation}
            onChange={(e) => setFormData({...formData, affiliation: e.target.value})}
            style={styles.input}
            placeholder="Institution/University"
            required
          />

          <label style={styles.label}>Role:</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
            style={styles.select}
          >
            <option value="Senior Fellow">Senior Fellow</option>
            <option value="Organizer">Organizer</option>
          </select>

          <div style={styles.buttonGroup}>
            <button type="submit" style={styles.submitBtn}>Create Invitation</button>
            <button type="button" onClick={onCancel} style={styles.cancelBtn}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit User Form
const EditUserForm = ({ user, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    full_name: user.full_name,
    affiliation: user.affiliation || '',
    role: user.role
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <h3 style={styles.modalTitle}>Edit User</h3>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Email:</label>
          <input
            type="email"
            value={user.email}
            disabled
            style={{...styles.input, backgroundColor: '#f5f5f5', color: '#666'}}
          />

          <label style={styles.label}>Full Name:</label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Affiliation:</label>
          <input
            type="text"
            value={formData.affiliation}
            onChange={(e) => setFormData({...formData, affiliation: e.target.value})}
            style={styles.input}
            placeholder="Institution/University"
            required
          />

          <label style={styles.label}>Role:</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
            style={styles.select}
          >
            <option value="Senior Fellow">Senior Fellow</option>
            <option value="Organizer">Organizer</option>
          </select>

          <div style={styles.buttonGroup}>
            <button type="submit" style={styles.submitBtn}>Save Changes</button>
            <button type="button" onClick={onCancel} style={styles.cancelBtn}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Profile Form (NEW)
const EditProfileForm = ({ userRole, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    full_name: userRole.full_name,
    affiliation: userRole.affiliation || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <h3 style={styles.modalTitle}>Edit My Profile</h3>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Email:</label>
          <input
            type="email"
            value={userRole.email}
            disabled
            style={{...styles.input, backgroundColor: '#f5f5f5', color: '#666'}}
          />

          <label style={styles.label}>Full Name:</label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
            style={styles.input}
            required
          />

          <label style={styles.label}>Affiliation:</label>
          <input
            type="text"
            value={formData.affiliation}
            onChange={(e) => setFormData({...formData, affiliation: e.target.value})}
            style={styles.input}
            placeholder="Institution/University"
            required
          />

          <label style={styles.label}>Role:</label>
          <input
            type="text"
            value={userRole.role}
            disabled
            style={{...styles.input, backgroundColor: '#f5f5f5', color: '#666'}}
          />

          <div style={styles.buttonGroup}>
            <button type="submit" style={styles.submitBtn}>Save Changes</button>
            <button type="button" onClick={onCancel} style={styles.cancelBtn}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Profile View Component (NEW)
const ProfileView = ({ userRole, onEditProfile }) => {
  return (
    <div>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>My Profile</h2>
        <button onClick={onEditProfile} style={styles.addBtn}>Edit Profile</button>
      </div>
      
      <div style={styles.section}>
        <div style={{display: 'grid', gap: '20px', maxWidth: '600px'}}>
          <div>
            <label style={{...styles.label, display: 'block', marginBottom: '8px'}}>Email:</label>
            <div style={{...styles.input, backgroundColor: '#f5f5f5', color: '#666'}}>
              {userRole.email}
            </div>
          </div>

          <div>
            <label style={{...styles.label, display: 'block', marginBottom: '8px'}}>Full Name:</label>
            <div style={{...styles.input, backgroundColor: '#f5f5f5', color: '#666'}}>
              {userRole.full_name}
            </div>
          </div>

          <div>
            <label style={{...styles.label, display: 'block', marginBottom: '8px'}}>Affiliation:</label>
            <div style={{...styles.input, backgroundColor: '#f5f5f5', color: '#666'}}>
              {userRole.affiliation || 'Not set'}
            </div>
          </div>

          <div>
            <label style={{...styles.label, display: 'block', marginBottom: '8px'}}>Role:</label>
            <div style={{...styles.input, backgroundColor: '#f5f5f5', color: '#666'}}>
              {userRole.role}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Agenda Sidebar with Calendar View
const AgendaSidebar = ({ agenda, onClose, onAddMeeting, onDeleteMeeting, showAddMeetingForm, onSubmitMeeting, onCancelMeeting, selectedTimeSlot, onSelectTimeSlot, formatDate, currentUser }) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getMeetingTypeColor = (type) => {
    switch(type) {
      case 'seminar': return '#e74c3c';
      case '1-to-1': return '#3498db';
      case 'group': return '#9b59b6';
      case 'social': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  // Get the 3 days
  const dayBefore = agenda.start_date.toDate ? agenda.start_date.toDate() : new Date(agenda.start_date);
  const seminarDay = agenda.seminar_date.toDate ? agenda.seminar_date.toDate() : new Date(agenda.seminar_date);
  const dayAfter = agenda.end_date.toDate ? agenda.end_date.toDate() : new Date(agenda.end_date);
  
  const days = [dayBefore, seminarDay, dayAfter];
  
  // Time slots from 8 AM to 8 PM
  const timeSlots = [];
  for (let hour = 8; hour <= 20; hour++) {
    timeSlots.push(hour);
  }

  const getMeetingsForDayAndHour = (day, hour) => {
    if (!agenda.meetings) return [];
    
    return agenda.meetings.filter(meeting => {
      const meetingDate = meeting.date.toDate ? meeting.date.toDate() : new Date(meeting.date);
      const meetingStart = meeting.start_time.toDate ? meeting.start_time.toDate() : new Date(meeting.start_time);
      
      const isSameDay = meetingDate.toDateString() === day.toDateString();
      const meetingHour = meetingStart.getHours();
      
      return isSameDay && meetingHour === hour;
    });
  };

  const handleTimeSlotClick = (day, hour) => {
    onSelectTimeSlot({ day, hour });
    onAddMeeting();
  };

  return (
    <div style={styles.agendaSidebar}>
      <div style={styles.sidebarHeader}>
        <div>
          <h3 style={styles.sidebarTitle}>{agenda.speaker_name}</h3>
          <p style={{margin: '4px 0', fontSize: '13px', color: '#666'}}>
            {formatDate(agenda.start_date)} - {formatDate(agenda.end_date)}
          </p>
        </div>
        <button onClick={onClose} style={styles.sidebarCloseBtn}>
          <X size={20} />
        </button>
      </div>

      <div style={styles.sidebarContent}>
        {!showAddMeetingForm ? (
          <>
            <div style={styles.calendarContainer}>
              <div style={styles.calendarDaysHeader}>
                <div style={styles.calendarTimeColumn}></div>
                {days.map((day, idx) => (
                  <div key={idx} style={styles.calendarDayHeader}>
                    <div style={styles.agendaCalendarDayName}>
                      {idx === 0 && 'Day Before'}
                      {idx === 1 && 'Seminar Day'}
                      {idx === 2 && 'Day After'}
                    </div>
                    <div style={styles.calendarDayDate}>
                      {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>

              <div style={styles.agendaCalendarGrid}>
                {timeSlots.map(hour => (
                  <React.Fragment key={hour}>
                    <div style={styles.timeSlotLabel}>
                      {hour}:00
                    </div>
                    {days.map((day, dayIdx) => {
                      const meetings = getMeetingsForDayAndHour(day, hour);
                      return (
                        <div
                          key={`${dayIdx}-${hour}`}
                          style={{
                            ...styles.timeSlotCell,
                            backgroundColor: meetings.length === 0 ? 'transparent' : '#f8f9fa',
                          }}
                          onClick={() => meetings.length === 0 && handleTimeSlotClick(day, hour)}
                          onMouseEnter={(e) => meetings.length === 0 && (e.currentTarget.style.backgroundColor = '#e7f3ff')}
                          onMouseLeave={(e) => meetings.length === 0 && (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          {meetings.map((meeting, meetingIdx) => (
                            <div
                              key={meetingIdx}
                              style={{
                                ...styles.calendarMeeting,
                                backgroundColor: getMeetingTypeColor(meeting.type),
                              }}
                            >
                              <div style={styles.calendarMeetingTitle}>
                                {meeting.title}
                                {meeting.is_locked && ' 🔒'}
                              </div>
                              <div style={styles.calendarMeetingTime}>
                                {formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}
                              </div>
                              {!meeting.is_locked && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const meetingIndex = agenda.meetings.indexOf(meeting);
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

            <div style={styles.agendaInfo}>
              <p style={{fontSize: '13px', color: '#666', marginBottom: '10px'}}>
                💡 Click on any empty time slot to add a meeting
              </p>
              <button onClick={() => onAddMeeting()} style={styles.addActionBtn}>
                + Add Meeting
              </button>
            </div>
          </>
        ) : (
          <AddMeetingForm
            onSubmit={onSubmitMeeting}
            onCancel={onCancelMeeting}
            agenda={agenda}
            selectedTimeSlot={selectedTimeSlot}
          />
        )}
      </div>
    </div>
  );
};

// Add Meeting Form
const AddMeetingForm = ({ onSubmit, onCancel, agenda, selectedTimeSlot }) => {
  const [formData, setFormData] = useState({
    title: '',
    type: '1-to-1',
    date: selectedTimeSlot ? selectedTimeSlot.day.toISOString().split('T')[0] : '',
    start_time: selectedTimeSlot ? `${selectedTimeSlot.hour.toString().padStart(2, '0')}:00` : '09:00',
    end_time: selectedTimeSlot ? `${(selectedTimeSlot.hour + 1).toString().padStart(2, '0')}:00` : '10:00',
    location: '',
    attendees: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div style={styles.addMeetingFormContainer}>
      <h4 style={styles.formTitle}>Add Meeting</h4>
      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>Meeting Title: *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          style={styles.input}
          placeholder="e.g., Meeting with Dr. Smith"
          required
        />

        <label style={styles.label}>Type: *</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({...formData, type: e.target.value})}
          style={styles.select}
          required
        >
          <option value="1-to-1">1-to-1 Meeting</option>
          <option value="group">Group Meeting</option>
          <option value="social">Social Event</option>
          <option value="seminar">Seminar</option>
        </select>

        <label style={styles.label}>Date: *</label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({...formData, date: e.target.value})}
          style={styles.input}
          required
        />

        <label style={styles.label}>Start Time: *</label>
        <input
          type="time"
          value={formData.start_time}
          onChange={(e) => setFormData({...formData, start_time: e.target.value})}
          style={styles.input}
          required
        />

        <label style={styles.label}>End Time: *</label>
        <input
          type="time"
          value={formData.end_time}
          onChange={(e) => setFormData({...formData, end_time: e.target.value})}
          style={styles.input}
          required
        />

        <label style={styles.label}>Location:</label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => setFormData({...formData, location: e.target.value})}
          style={styles.input}
          placeholder="e.g., Office 301, Coffee Room"
        />

        <label style={styles.label}>Attendees (comma-separated):</label>
        <input
          type="text"
          value={formData.attendees}
          onChange={(e) => setFormData({...formData, attendees: e.target.value})}
          style={styles.input}
          placeholder="e.g., Dr. Smith, Dr. Jones"
        />

        <label style={styles.label}>Notes:</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          style={{...styles.input, minHeight: '80px', resize: 'vertical'}}
          placeholder="Additional notes about the meeting"
        />

        <div style={styles.buttonGroup}>
          <button type="submit" style={styles.submitBtn}>Add Meeting</button>
          <button type="button" onClick={onCancel} style={styles.cancelBtn}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

// Poster Sidebar Component
const PosterSidebar = ({ speaker, onClose, formatDate, allUsers }) => {
  const defaultVenue = "BARCELONA COLLABORATORIUM\nEdifici Fundació Pasqual Maragall,\n2nd Floor Carrer Wellington 30, 08005,\nBarcelona (Spain)";
  
  const [posterData, setPosterData] = useState({
    speakerName: speaker.full_name,
    speakerAffiliation: speaker.affiliation || '',
    speakerCountry: speaker.country  || '',
    talkTitle: speaker.talk_title || '',
    hostName: speaker.host || '',
    hostAffiliation: '',
    dateTime: speaker.assigned_date ? 
      `${formatDate(speaker.assigned_date)} at 10:00` : '',
    venue: defaultVenue
  });


  useEffect(() => {
    // Find host affiliation
    const host = allUsers.find(u => u.full_name === speaker.host);
    if (host && host.affiliation) {
      setPosterData(prev => ({...prev, hostAffiliation: host.affiliation}));
    }
  }, [speaker.host, allUsers]);

  const handleDownloadPDF = async () => {
    try {
      const posterElement = document.getElementById('poster-preview');
      if (!posterElement) {
        alert('Poster preview not found');
        return;
      }

      const html2canvas = await import('html2canvas');
      const canvas = await html2canvas.default(posterElement, {
        scale: 2,
        backgroundColor: null,
        logging: false,
        useCORS: true
      });

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `poster_${posterData.speakerName.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error('Error generating poster:', error);
      alert('Error generating poster. Please try right-clicking on the preview and selecting "Save image as..."');
    }
  };

//   const handleDownloadSVG = () => {
//     try {
//       const posterElement = document.getElementById('poster-preview');
//       if (!posterElement) {
//         alert('Poster preview not found');
//         return;
//       }

//       // const clonedElement = posterElement.cloneNode(true);
//       const styles = window.getComputedStyle(posterElement);
      
//       const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
// <svg xmlns="http://www.w3.org/2000/svg" width="1123" height="794">
//   <foreignObject width="100%" height="100%">
//     <div xmlns="http://www.w3.org/1999/xhtml" style="${Array.from(styles).map(key => `${key}:${styles.getPropertyValue(key)}`).join(';')}">
//       ${posterElement.innerHTML}
//     </div>
//   </foreignObject>
// </svg>`;

//       const blob = new Blob([svgContent], { type: 'image/svg+xml' });
//       const url = URL.createObjectURL(blob);
//       const link = document.createElement('a');
//       link.href = url;
//       link.download = `poster_${posterData.speakerName.replace(/\s+/g, '_')}.svg`;
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//       URL.revokeObjectURL(url);
//     } catch (error) {
//       console.error('Error generating SVG:', error);
//       alert('Error generating SVG. Please try the PNG download instead.');
//     }
//   };

  return (
    <div style={styles.posterSidebar}>
      <div style={styles.posterSidebarContent}>
        <div style={styles.posterSidebarHeader}>
          <h3 style={styles.posterSidebarTitle}>Generate Poster</h3>
          <button onClick={onClose} style={styles.sidebarCloseBtn}>
            <X size={24} />
          </button>
        </div>

        <div style={styles.posterFormAndPreview}>
          <div style={styles.posterForm}>
            <h4 style={styles.formSectionTitle}>Poster Information</h4>

            <label style={styles.label}>Talk Title:</label>
            <textarea
              value={posterData.talkTitle}
              onChange={(e) => setPosterData({...posterData, talkTitle: e.target.value})}
              style={{...styles.input, minHeight: '80px', resize: 'vertical'}}
            />

            <label style={styles.label}>Speaker Name:</label>
            <input
              type="text"
              value={posterData.speakerName}
              onChange={(e) => setPosterData({...posterData, speakerName: e.target.value})}
              style={styles.input}
            />

            <label style={styles.label}>Speaker Affiliation:</label>
            <input
              type="text"
              value={posterData.speakerAffiliation}
              onChange={(e) => setPosterData({...posterData, speakerAffiliation: e.target.value})}
              style={styles.input}
            />

            <label style={styles.label}>Country:</label>
            <input
              type="text"
              value={posterData.speakerCountry}
              onChange={(e) => setPosterData({...posterData, speakerCountry: e.target.value})}
              style={styles.input}
            />

            <label style={styles.label}>Host Name:</label>
            <input
              type="text"
              value={posterData.hostName}
              onChange={(e) => setPosterData({...posterData, hostName: e.target.value})}
              style={styles.input}
            />

            <label style={styles.label}>Host Affiliation:</label>
            <input
              type="text"
              value={posterData.hostAffiliation}
              onChange={(e) => setPosterData({...posterData, hostAffiliation: e.target.value})}
              style={styles.input}
            />


            <label style={styles.label}>Date & Time:</label>
            <input
              type="text"
              value={posterData.dateTime}
              onChange={(e) => setPosterData({...posterData, dateTime: e.target.value})}
              style={styles.input}
            />

            <label style={styles.label}>Venue:</label>
            <textarea
              value={posterData.venue}
              onChange={(e) => setPosterData({...posterData, venue: e.target.value})}
              style={{...styles.input, minHeight: '100px', resize: 'vertical'}}
            />

            <div style={{marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px'}}>
              <button 
                onClick={handleDownloadPDF}
                style={{...styles.submitBtn, backgroundColor: '#00bcd4'}}
              >
                📥 Download Poster (PNG)
              </button>
              {/* <button 
                onClick={handleDownloadSVG}
                style={{...styles.submitBtn, backgroundColor: '#9b59b6'}}
              >
                📥 Download Poster (SVG)
              </button> */}
            </div>
          </div>

          <div style={styles.posterPreviewContainer}>
            <h4 style={styles.formSectionTitle}>Preview</h4>
            <div id="poster-preview" style={styles.posterPreview}>
              <div style={styles.posterHeader}>
                <div style={styles.posterLogosTop}>
                  <div style={styles.posterLogoItem}>
                    <span style={styles.logoText}>EMBL</span>
                  </div>
                  <div style={styles.posterLogoItem}>
                    <span style={styles.logoText}>CRG</span>
                  </div>
                </div>
              </div>

              <div style={styles.posterTitleBanner}>
                <div style={styles.posterBannerText}>BARCELONA COLLABORATORIUM</div>
                <div style={styles.posterBannerText}>SEMINAR SERIES</div>
              </div>

              <div style={styles.posterContentGrid}>
                <div style={styles.posterLeftColumn}>
                  <div style={styles.posterInfoBlock}>
                    <div style={styles.posterLabelPink}>HOST:</div>
                    <div style={styles.posterContentText}>
                      {posterData.hostName}
                      {posterData.hostAffiliation}
                    </div>
                  </div>

                  <div style={styles.posterInfoBlock}>
                    <div style={styles.posterLabelPink}>VENUE:</div>
                    <div style={styles.posterContentText}>
                      {posterData.venue.split('\n').map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </div>
                  </div>

                  <div style={styles.posterInfoBlock}>
                    <div style={styles.posterLabelPink}>MORE INFO AND REGISTRATION:</div>
                    <div style={styles.posterQRCode}>
                      QR code (resized)
                    </div>
                  </div>
                </div>

                <div style={styles.posterRightColumn}>
                  <div style={styles.posterInfoBlock}>
                    <div style={styles.posterLabelPink}>SPEAKER:</div>
                    <div style={styles.posterSpeakerNameLarge}>{posterData.speakerName},</div>
                    <div style={styles.posterContentText}>{posterData.speakerAffiliation}</div>
                    {posterData.speakerAffiliation && (
                      <div style={styles.posterAffiliationSmall}>
                        ({posterData.speakerCountry.split(',').pop().trim()})
                      </div>
                    )}
                  </div>

                  <div style={styles.posterInfoBlock}>
                    <div style={styles.posterLabelPink}>TITLE:</div>
                    <div style={styles.posterTitleItalic}>"{posterData.talkTitle}"</div>
                  </div>

                  <div style={styles.posterInfoBlock}>
                    <div style={styles.posterLabelPink}>DATE & TIME:</div>
                    <div style={styles.posterContentText}>{posterData.dateTime}</div>
                  </div>
                </div>
              </div>

              <div style={styles.posterFooter}>
                <div style={styles.posterFooterSupported}>Supported by:</div>
                <div style={styles.posterFooterLogos}>
                  <span style={styles.footerLogoText}>Excelencia Severo Ochoa</span>
                  <span style={styles.footerLogoText}>Gobierno de España - Ministerio</span>
                  <span style={styles.footerLogoText}>Generalitat de Catalunya</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
          

// Actions Sidebar Component
const ActionsSidebar = ({ speaker, onClose, onUpdateAction, onAddAction, currentUser, formatDate }) => {
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
                    // Fallback for browsers without clipboard API
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
      <div style={styles.sidebarHeader}>
        <h3 style={styles.sidebarTitle}>{speaker.full_name}</h3>
        <button onClick={onClose} style={styles.sidebarCloseBtn}>
          <X size={20} />
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
                                  // Fallback for browsers without clipboard API
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
};

const StatisticsView = ({ speakers, formatDate, onAddPastSpeaker, isOrganizer }) => {
  const [selectedYear, setSelectedYear] = useState('all');
  
  const acceptedSpeakers = speakers.filter(s => s.status === 'Accepted');
  
  const getYearFromDate = (date) => {
    if (!date) return null;
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.getFullYear();
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
          .map(year => (
          <div key={year} style={styles.yearSection}>
            <h4 style={styles.yearTitle}>{year} ({speakersByYear[year].length} speakers)</h4>
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
          </div>
        ))}
      </div>
    </div>
  );
};

// Notification Panel Component
const NotificationPanel = ({ responses, currentUser, formatDate }) => {
  const [dismissed, setDismissed] = useState(new Set());

  const handleDismiss = (speakerId) => {
    setDismissed(prev => new Set([...prev, speakerId]));
  };

  const visibleResponses = responses.filter(r => !dismissed.has(r.id));

  if (visibleResponses.length === 0) return null;

  return (
    <div style={styles.notificationPanel}>
      <h3 style={styles.notificationTitle}>📬 Recent Speaker Responses</h3>
      {visibleResponses.map(speaker => {
        const responseAction = speaker.actions.find(a => a.type === 'speaker_responded');
        const isRelevantToUser = 
          currentUser.role === 'Organizer' || 
          speaker.host === currentUser.full_name ||
          speaker.proposed_by_id === currentUser.id;
        
        return (
          <div 
            key={speaker.id} 
            style={{
              ...styles.notificationItem,
              backgroundColor: isRelevantToUser ? '#e8f4fd' : '#f8f9fa',
              borderLeft: isRelevantToUser ? '4px solid #3498db' : '4px solid #95a5a6'
            }}
          >
            <div style={styles.notificationContent}>
              <div style={styles.notificationHeader}>
                <span style={{fontSize: '20px', marginRight: '8px'}}>
                  {responseAction.action === 'accepted' ? '✅' : '❌'}
                </span>
                <strong>{speaker.full_name}</strong>
                <span style={{marginLeft: '8px'}}>
                  {responseAction.action === 'accepted' ? 'accepted' : 'declined'}
                </span>
                {isRelevantToUser && (
                  <span style={styles.notificationBadge}>
                    {speaker.host === currentUser.full_name ? 'You are host' : 
                     speaker.proposed_by_id === currentUser.id ? 'Your proposal' : 
                     'Organizer'}
                  </span>
                )}
              </div>
              <div style={styles.notificationDetails}>
                <span style={{fontSize: '13px', color: '#666'}}>
                  {new Date(responseAction.timestamp).toLocaleString()}
                </span>
                {responseAction.action === 'accepted' && speaker.assigned_date && (
                  <span style={{marginLeft: '15px', fontSize: '13px', color: '#555'}}>
                    📅 {formatDate(speaker.assigned_date)}
                  </span>
                )}
                <span style={{marginLeft: '15px', fontSize: '13px', color: '#555'}}>
                  🎤 Host: {speaker.host}
                </span>
              </div>
            </div>
            <button 
              onClick={() => handleDismiss(speaker.id)}
              style={styles.notificationDismiss}
              title="Dismiss"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
};

// Dashboard View
const DashboardView = ({ userRole, speakers, availableDates, onAcceptSpeaker, onRejectSpeaker, onResendInvitation, onEditSpeaker, onEditConfirmed, onViewActions, onViewAgenda, onGeneratePoster, onDeleteInvited, getRankingColor, getStatusColor, formatDate }) => {
  if (!userRole) {
    return <div style={styles.emptyText}>Loading user data...</div>;
  }

  // Helper function to check if invitation is overdue
  const isInvitationOverdue = (speaker) => {
    if (speaker.status !== 'Invited' || !speaker.response_deadline) return false;
    const deadline = speaker.response_deadline.toDate ? speaker.response_deadline.toDate() : new Date(speaker.response_deadline);
    return deadline < new Date();
  };

  // Get recent speaker responses (last 7 days)
  const getRecentResponses = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return speakers.filter(speaker => {
      if (!speaker.actions || speaker.actions.length === 0) return false;
      
      const responseAction = speaker.actions.find(a => a.type === 'speaker_responded');
      if (!responseAction) return false;
      
      const responseDate = new Date(responseAction.timestamp);
      return responseDate >= sevenDaysAgo;
    }).sort((a, b) => {
      const aAction = a.actions.find(act => act.type === 'speaker_responded');
      const bAction = b.actions.find(act => act.type === 'speaker_responded');
      return new Date(bAction.timestamp) - new Date(aAction.timestamp);
    });
  };

  const recentResponses = getRecentResponses();

  if (userRole.role === 'Organizer') {
    const proposedSpeakers = speakers.filter(s => s.status === 'Proposed');
    const invitedSpeakers = speakers.filter(s => s.status === 'Invited');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const acceptedSpeakers = speakers.filter(s => {
      if (s.status !== 'Accepted') return false;
      if (!s.assigned_date) return true;
      const speakerDate = s.assigned_date.toDate ? s.assigned_date.toDate() : new Date(s.assigned_date);
      return speakerDate >= today;
    });

    return (
      <div style={styles.dashboardContainer}>
        {recentResponses.length > 0 && (
          <NotificationPanel 
            responses={recentResponses} 
            currentUser={userRole}
            formatDate={formatDate}
          />
        )}
        <div style={styles.dashboardMain}>
          <h2 style={styles.sectionTitle}>Organizer Dashboard</h2>
          
          <div style={styles.section}>
            <h3 style={styles.subsectionTitle}>Proposed Speakers Awaiting Approval ({proposedSpeakers.length})</h3>
            {proposedSpeakers.length === 0 ? (
              <p style={styles.emptyText}>No speakers pending approval</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Affiliation</th>
                    <th style={styles.th}>Country</th>
                    <th style={styles.th}>Expertise</th>
                    <th style={styles.th}>Ranking</th>
                    <th style={styles.th}>Notes</th>
                    <th style={styles.th}>Host</th>
                    <th style={styles.th}>Proposed By</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {proposedSpeakers.map(speaker => (
                    <tr key={speaker.id}>
                      <td style={styles.td}>{speaker.full_name}</td>
                      <td style={styles.td}>{speaker.email}</td>
                      <td style={styles.td}>{speaker.affiliation}</td>
                      <td style={styles.td}>{speaker.country || 'N/A'}</td>
                      <td style={styles.td}>{speaker.area_of_expertise}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          backgroundColor: getRankingColor(speaker.ranking)
                        }}>
                          {speaker.ranking}
                        </span>
                      </td>
                      <td style={styles.td}>{speaker.notes}</td>
                      <td style={styles.td}>{speaker.host}</td>
                      <td style={styles.td}>{speaker.proposed_by_name}</td>
                      <td style={styles.td}>
                        <button 
                          onClick={() => onEditSpeaker(speaker)}
                          style={{...styles.actionBtn, backgroundColor: '#f39c12'}}>
                          Edit
                        </button>
                        <button 
                          onClick={() => onAcceptSpeaker(speaker.id)}
                          style={{...styles.actionBtn, ...styles.acceptBtn}}>
                          Accept
                        </button>
                        <button 
                          onClick={() => onRejectSpeaker(speaker.id)}
                          style={{...styles.actionBtn, ...styles.declineBtn}}>
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={styles.section}>
            <h3 style={styles.subsectionTitle}>Invited Speakers Awaiting Response ({invitedSpeakers.length})</h3>
            {invitedSpeakers.length === 0 ? (
              <p style={styles.emptyText}>No pending invitations</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Invited On</th>
                    <th style={styles.th}>Deadline</th>
                    <th style={styles.th}>Host</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invitedSpeakers.map(speaker => (
                    <tr 
                      key={speaker.id}
                      style={isInvitationOverdue(speaker) ? {backgroundColor: '#ffe0b2'} : {}}
                    >
                      <td style={styles.td}>
                        {speaker.full_name}
                        {isInvitationOverdue(speaker) && (
                          <span style={{marginLeft: '8px', color: '#ff9800', fontWeight: '600'}}>⚠️</span>
                        )}
                      </td>
                      <td style={styles.td}>{speaker.email}</td>
                      <td style={styles.td}>{formatDate(speaker.invitation_sent_date)}</td>
                      <td style={styles.td}>{formatDate(speaker.response_deadline)}</td>
                      <td style={styles.td}>{speaker.host}</td>
                      <td style={styles.td}>
                        <button 
                          onClick={() => onResendInvitation(speaker)}
                          style={{...styles.actionBtn, backgroundColor: '#3498db'}}>
                          Resend/View
                        </button>
                        <button 
                          onClick={() => onViewActions(speaker)}
                          style={{...styles.actionBtn, backgroundColor: '#9b59b6'}}>
                          Actions
                        </button>
                        <button 
                          onClick={() => onDeleteInvited(speaker.id)}
                          style={{...styles.actionBtn, ...styles.declineBtn}}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={styles.section}>
            <h3 style={styles.subsectionTitle}>Confirmed Upcoming Speakers ({acceptedSpeakers.length})</h3>
            <p style={{fontSize: '14px', color: '#666', marginBottom: '15px', fontStyle: 'italic'}}>
              Showing only upcoming speakers. View all past speakers in the "Past Speakers" tab.
            </p>
            {acceptedSpeakers.length === 0 ? (
              <p style={styles.emptyText}>No confirmed upcoming speakers</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Talk Title</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Host</th>
                    <th style={styles.th}>Abstract</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {acceptedSpeakers.map(speaker => (
                    <tr key={speaker.id}>
                      <td style={styles.td}>{speaker.full_name}</td>
                      <td style={styles.td}>{speaker.talk_title || 'TBD'}</td>
                      <td style={styles.td}>{formatDate(speaker.assigned_date)}</td>
                      <td style={styles.td}>{speaker.host}</td>
                      <td style={styles.td}>
                        {speaker.talk_abstract ? (
                          <span style={styles.abstractPreview} title={speaker.talk_abstract}>
                            {speaker.talk_abstract.substring(0, 50)}...
                          </span>
                        ) : (
                          <em style={{color: '#999'}}>No abstract</em>
                        )}
                      </td>
                      <td style={styles.td}>
                        <button 
                          onClick={() => onViewAgenda(speaker)}
                          style={{...styles.actionBtn, backgroundColor: '#9b59b6'}}>
                          Agenda
                        </button>
                        <button 
                          onClick={() => onGeneratePoster(speaker)}
                          style={{...styles.actionBtn, backgroundColor: '#16a085'}}>
                          Poster
                        </button>
                        <button 
                          onClick={() => onEditConfirmed(speaker)}
                          style={{...styles.actionBtn, backgroundColor: '#f39c12'}}>
                          Edit
                        </button>
                        <button 
                          onClick={() => onViewActions(speaker)}
                          style={{...styles.actionBtn, backgroundColor: '#3498db'}}>
                          Actions
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Senior Fellow Dashboard
  const mySpeakers = speakers.filter(s => s.proposed_by_id === userRole.id);
  const allProposedSpeakers = speakers.filter(s => s.status === 'Proposed');
  const invitedSpeakers = speakers.filter(s => s.status === 'Invited');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const acceptedSpeakers = speakers.filter(s => {
    if (s.status !== 'Accepted') return false;
    if (!s.assigned_date) return true;
    const speakerDate = s.assigned_date.toDate ? s.assigned_date.toDate() : new Date(s.assigned_date);
    return speakerDate >= today;
  });

  return (
    <div style={styles.dashboardContainer}>
      {recentResponses.length > 0 && (
        <NotificationPanel 
          responses={recentResponses} 
          currentUser={userRole}
          formatDate={formatDate}
        />
      )}
      <div style={styles.dashboardMain}>
        <h2 style={styles.sectionTitle}>Senior Fellow Dashboard</h2>
        
        <div style={styles.section}>
          <h3 style={styles.subsectionTitle}>All Proposed Speakers ({allProposedSpeakers.length})</h3>
          {allProposedSpeakers.length === 0 ? (
            <p style={styles.emptyText}>No speakers have been proposed yet</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Affiliation</th>
                  <th style={styles.th}>Country</th>
                  <th style={styles.th}>Expertise</th>
                  <th style={styles.th}>Ranking</th>
                  <th style={styles.th}>Notes</th>
                  <th style={styles.th}>Host</th>
                  <th style={styles.th}>Proposed By</th>
                </tr>
              </thead>
              <tbody>
                {allProposedSpeakers.map(speaker => (
                  <tr key={speaker.id} style={speaker.proposed_by_id === userRole.id ? {backgroundColor: '#f0f8ff'} : {}}>
                    <td style={styles.td}>
                      {speaker.full_name}
                      {speaker.proposed_by_id === userRole.id && (
                        <span style={{color: '#3498db', marginLeft: '8px', fontSize: '12px', fontWeight: '600'}}>
                          (You)
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>{speaker.affiliation}</td>
                    <td style={styles.td}>{speaker.country || 'N/A'}</td>
                    <td style={styles.td}>{speaker.area_of_expertise}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: getRankingColor(speaker.ranking)
                      }}>
                        {speaker.ranking}
                      </span>
                    </td>
                    <td style={styles.td}>{speaker.notes}</td>
                    <td style={styles.td}>{speaker.host}</td>
                    <td style={styles.td}>{speaker.proposed_by_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={styles.section}>
          <h3 style={styles.subsectionTitle}>Invited Speakers Awaiting Response ({invitedSpeakers.length})</h3>
          {invitedSpeakers.length === 0 ? (
            <p style={styles.emptyText}>No pending invitations</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Expertise</th>
                  <th style={styles.th}>Host</th>
                  <th style={styles.th}>Invited On</th>
                  <th style={styles.th}>Deadline</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitedSpeakers.map(speaker => (
                  <tr 
                    key={speaker.id} 
                    style={{
                      ...(speaker.proposed_by_id === userRole.id ? {backgroundColor: '#f0f8ff'} : {}),
                      ...(isInvitationOverdue(speaker) ? {backgroundColor: '#ffe0b2'} : {})
                    }}
                  >
                    <td style={styles.td}>
                      {speaker.full_name}
                      {speaker.proposed_by_id === userRole.id && (
                        <span style={{color: '#3498db', marginLeft: '8px', fontSize: '12px', fontWeight: '600'}}>
                          (Your proposal)
                        </span>
                      )}
                      {isInvitationOverdue(speaker) && (
                        <span style={{marginLeft: '8px', color: '#ff9800', fontWeight: '600'}}>⚠️</span>
                      )}
                    </td>
                    <td style={styles.td}>{speaker.email}</td>
                    <td style={styles.td}>{speaker.area_of_expertise}</td>
                    <td style={styles.td}>{speaker.host}</td>
                    <td style={styles.td}>{formatDate(speaker.invitation_sent_date)}</td>
                    <td style={styles.td}>{formatDate(speaker.response_deadline)}</td>
                    <td style={styles.td}>
                      {(speaker.host === userRole.full_name || speaker.proposed_by_id === userRole.id) && (
                        <button 
                          onClick={() => onResendInvitation(speaker)}
                          style={{...styles.actionBtn, backgroundColor: '#3498db'}}>
                          Resend/View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={styles.section}>
          <h3 style={styles.subsectionTitle}>Confirmed Upcoming Speakers ({acceptedSpeakers.length})</h3>
          <p style={{fontSize: '14px', color: '#666', marginBottom: '15px', fontStyle: 'italic'}}>
            Showing only upcoming speakers. View all past speakers in the "Past Speakers" tab.
          </p>
          {acceptedSpeakers.length === 0 ? (
            <p style={styles.emptyText}>No confirmed upcoming speakers</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Talk Title</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Host</th>
                  <th style={styles.th}>Proposed By</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {acceptedSpeakers.map(speaker => (
                  <tr key={speaker.id} style={speaker.proposed_by_id === userRole.id ? {backgroundColor: '#f0f8ff'} : {}}>
                    <td style={styles.td}>
                      {speaker.full_name}
                      {speaker.proposed_by_id === userRole.id && (
                        <span style={{color: '#3498db', marginLeft: '8px', fontSize: '12px', fontWeight: '600'}}>
                          (Your proposal)
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>{speaker.talk_title || 'TBD'}</td>
                    <td style={styles.td}>{formatDate(speaker.assigned_date)}</td>
                    <td style={styles.td}>{speaker.host}</td>
                    <td style={styles.td}>{speaker.proposed_by_name}</td>
                    <td style={styles.td}>
                      {speaker.host === userRole.full_name && (
                        <>
                          <button 
                            onClick={() => onViewAgenda(speaker)}
                            style={{...styles.actionBtn, backgroundColor: '#9b59b6'}}>
                            Agenda
                          </button>
                          <button 
                            onClick={() => onGeneratePoster(speaker)}
                            style={{...styles.actionBtn, backgroundColor: '#16a085'}}>
                            Poster
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={styles.section}>
          <h3 style={styles.subsectionTitle}>My Proposals Summary</h3>
          <p style={{fontSize: '16px', color: '#555'}}>
            You have proposed <strong>{mySpeakers.length}</strong> speaker(s):
          </p>
          <ul style={{fontSize: '15px', color: '#555', lineHeight: '1.8'}}>
            <li>Proposed: <strong>{mySpeakers.filter(s => s.status === 'Proposed').length}</strong></li>
            <li>Invited (awaiting response): <strong>{mySpeakers.filter(s => s.status === 'Invited').length}</strong></li>
            <li>Accepted: <strong>{mySpeakers.filter(s => s.status === 'Accepted').length}</strong></li>
            <li>Declined: <strong>{mySpeakers.filter(s => s.status === 'Declined').length}</strong></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Other View Components
const DatesView = ({ dates, speakers, onAddDate, onDeleteDate, formatDate }) => {
  return (
    <div>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Available Dates</h2>
        <button onClick={onAddDate} style={styles.addBtn}>+ Add Date</button>
      </div>
      
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Date</th>
            <th style={styles.th}>Talk Title</th>
            <th style={styles.th}>Host</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Locked By</th>
            <th style={styles.th}>Notes</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {dates.map(date => {
            const lockedSpeaker = speakers.find(s => s.id === date.locked_by_id);
            return (
              <tr key={date.id}>
                <td style={styles.td}>{formatDate(date.date)}</td>
                <td style={styles.td}>{date.talk_title || '-'}</td>
                <td style={styles.td}>{date.host || '-'}</td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    backgroundColor: date.available ? '#00cc00' : '#ff4444'
                  }}>
                    {date.available ? 'Available' : 'Locked'}
                  </span>
                </td>
                <td style={styles.td}>{lockedSpeaker?.full_name || '-'}</td>
                <td style={styles.td}>{date.notes || '-'}</td>
                <td style={styles.td}>
                  {date.available && (
                    <button 
                      onClick={() => onDeleteDate(date.id)}
                      style={{...styles.actionBtn, ...styles.declineBtn}}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const InvitationsView = ({ invitations, onCreateInvitation, formatDate }) => {
  return (
    <div>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>User Invitations</h2>
        <button onClick={onCreateInvitation} style={styles.addBtn}>+ Create Invitation</button>
      </div>
      
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Affiliation</th>
            <th style={styles.th}>Role</th>
            <th style={styles.th}>Invited By</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Expires</th>
          </tr>
        </thead>
        <tbody>
          {invitations.map(inv => (
            <tr key={inv.id}>
              <td style={styles.td}>{inv.email}</td>
              <td style={styles.td}>{inv.full_name}</td>
              <td style={styles.td}>{inv.affiliation || 'N/A'}</td>
              <td style={styles.td}>{inv.role}</td>
              <td style={styles.td}>{inv.invited_by_name}</td>
              <td style={styles.td}>
                <span style={{
                  ...styles.badge,
                  backgroundColor: inv.used ? '#999' : '#00cc00'
                }}>
                  {inv.used ? 'Used' : 'Active'}
                </span>
              </td>
              <td style={styles.td}>{formatDate(inv.expires_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ManageUsersView = ({ users, currentUserId, onEditUser, onDeleteUser, onPasswordReset, formatDate }) => {
  return (
    <div>
      <h2 style={styles.sectionTitle}>Manage Users</h2>
      <div style={styles.section}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Affiliation</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Created</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td style={styles.td}>
                  {user.full_name}
                  {user.id === currentUserId && <span style={{color: '#3498db', marginLeft: '8px'}}>(You)</span>}
                </td>
                <td style={styles.td}>{user.email}</td>
                <td style={styles.td}>{user.affiliation || 'N/A'}</td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    backgroundColor: user.role === 'Organizer' ? '#3498db' : '#9b59b6'
                  }}>
                    {user.role}
                  </span>
                </td>
                <td style={styles.td}>{formatDate(user.createdAt)}</td>
                <td style={styles.td}>
                  <button 
                    onClick={() => onEditUser(user)}
                    style={{...styles.actionBtn, backgroundColor: '#f39c12'}}>
                    Edit
                  </button>
                  <button 
                    onClick={() => onPasswordReset(user.email)}
                    style={{...styles.actionBtn, backgroundColor: '#3498db'}}>
                    Reset Password
                  </button>
                  {user.id !== currentUserId && (
                    <button 
                      onClick={() => onDeleteUser(user.id, user.email)}
                      style={{...styles.actionBtn, ...styles.declineBtn}}>
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ProposeSpeakerView = ({ onAddSpeaker, speakers, onEditSpeaker, onDeleteSpeaker, getRankingColor, getStatusColor, formatDate }) => {
  // Filter out past speakers - only show speakers that are still in process
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const activeSpeakers = speakers.filter(s => {
    // Show all non-accepted speakers (Proposed, Invited, Declined)
    if (s.status !== 'Accepted') return true;
    
    // For accepted speakers, only show if talk hasn't happened yet
    if (!s.assigned_date) return true;
    const speakerDate = s.assigned_date.toDate ? s.assigned_date.toDate() : new Date(s.assigned_date);
    return speakerDate >= today;
  });

  return (
    <div>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Propose Speaker</h2>
        <button onClick={onAddSpeaker} style={styles.addBtn}>+ Propose New Speaker</button>
      </div>

      <div style={styles.section}>
        <h3 style={styles.subsectionTitle}>My Active Speaker Proposals ({activeSpeakers.length})</h3>
        <p style={{fontSize: '14px', color: '#666', marginBottom: '15px', fontStyle: 'italic'}}>
          Showing only active proposals and upcoming speakers. Past speakers are not shown here.
        </p>
        {activeSpeakers.length === 0 ? (
          <p style={styles.emptyText}>You haven't proposed any active speakers</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Affiliation</th>
                <th style={styles.th}>Country</th>
                <th style={styles.th}>Expertise</th>
                <th style={styles.th}>Ranking</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Notes</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeSpeakers.map(speaker => (
                <tr key={speaker.id}>
                  <td style={styles.td}>{speaker.full_name}</td>
                  <td style={styles.td}>{speaker.email}</td>
                  <td style={styles.td}>{speaker.affiliation}</td>
                  <td style={styles.td}>{speaker.country || 'N/A'}</td>
                  <td style={styles.td}>{speaker.area_of_expertise}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: getRankingColor(speaker.ranking)
                    }}>
                      {speaker.ranking}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: getStatusColor(speaker.status)
                    }}>
                      {speaker.status}
                    </span>
                  </td>
                  <td style={styles.td}>{formatDate(speaker.assigned_date)}</td>
                  <td style={styles.td}>{speaker.notes}</td>
                  <td style={styles.td}>
                    {speaker.status === 'Proposed' && (
                      <>
                        <button 
                          onClick={() => onEditSpeaker(speaker)}
                          style={{...styles.actionBtn, backgroundColor: '#f39c12'}}>
                          Edit
                        </button>
                        <button 
                          onClick={() => onDeleteSpeaker(speaker.id)}
                          style={{...styles.actionBtn, ...styles.declineBtn}}>
                          Delete
                        </button>
                      </>
                    )}
                    {speaker.status !== 'Proposed' && (
                      <em style={{color: '#999', fontSize: '13px'}}>
                        {speaker.status === 'Invited' && 'Awaiting response'}
                        {speaker.status === 'Accepted' && 'Confirmed'}
                        {speaker.status === 'Declined' && 'Declined'}
                      </em>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// Login Component
const LoginView = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div style={styles.loginContainer}>
      <div style={styles.loginBox}>
        <h2 style={styles.loginTitle}>Seminar Management Login</h2>
        <form onSubmit={handleSubmit} style={styles.loginForm}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          <button type="submit" style={styles.submitBtn}>Login</button>
        </form>
      </div>
    </div>
  );
};

// Signup Component
const SignupView = ({ invitation, onSignup }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }
    
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    onSignup(password);
  };

  return (
    <div style={styles.loginContainer}>
      <div style={styles.loginBox}>
        <h2 style={styles.loginTitle}>Create Your Account</h2>
        <p style={styles.signupWelcome}>
          Welcome, <strong>{invitation.full_name}</strong>!
        </p>
        <p style={styles.signupInfo}>
          You've been invited to join as a <strong>{invitation.role}</strong>.
          <br />
          Please create a password to complete your registration.
        </p>
        <form onSubmit={handleSubmit} style={styles.loginForm}>
          <input
            type="email"
            value={invitation.email}
            disabled
            style={{...styles.input, backgroundColor: '#f5f5f5', color: '#666'}}
          />
          <input
            type="password"
            placeholder="Create Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
            minLength={6}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={styles.input}
            required
          />
          <button type="submit" style={styles.submitBtn}>Create Account</button>
        </form>
      </div>
    </div>
  );
};

// Calendar Date Picker Component
const CalendarDatePicker = ({ availableDates, selectedDate, onSelectDate, formatDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const isDateAvailable = (date) => {
    if (!date) return false;
    const dateString = date.toISOString().split('T')[0];
    return availableDates.some(d => {
      if (!d.available || d.locked_by_id === 'DELETED') return false;
      try {
        const availDate = d.date.toDate ? d.date.toDate() : new Date(d.date);
        if (isNaN(availDate.getTime())) return false;
        return availDate.toISOString().split('T')[0] === dateString;
      } catch (e) {
        return false;
      }
    });
  };

  const getDateInfo = (date) => {
    if (!date) return null;
    const dateString = date.toISOString().split('T')[0];
    return availableDates.find(d => {
      if (!d.available || d.locked_by_id === 'DELETED') return false;
      try {
        const availDate = d.date.toDate ? d.date.toDate() : new Date(d.date);
        if (isNaN(availDate.getTime())) return false;
        return availDate.toISOString().split('T')[0] === dateString;
      } catch (e) {
        return false;
      }
    });
  };

  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handlePrevMonth = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <div style={styles.calendar}>
      <div style={styles.calendarHeader}>
        <button 
          type="button"
          onClick={handlePrevMonth}
          style={styles.calendarNavBtn}
        >
          ◀
        </button>
        <h4 style={styles.calendarMonth}>{monthName}</h4>
        <button 
          type="button"
          onClick={handleNextMonth}
          style={styles.calendarNavBtn}
        >
          ▶
        </button>
      </div>
      <div style={styles.calendarGrid}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} style={styles.calendarDayName}>{day}</div>
        ))}
        {days.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} style={styles.calendarDayEmpty} />;
          
          const available = isDateAvailable(date);
          const dateInfo = getDateInfo(date);
          const isSelected = selectedDate && dateInfo &&
            dateInfo.id === selectedDate;

          return (
            <div
              key={date.toISOString()}
              onClick={() => available && onSelectDate(dateInfo.id)}
              style={{
                ...styles.calendarDay,
                ...(available ? styles.calendarDayAvailable : {}),
                ...(isSelected ? styles.calendarDaySelected : {}),
                cursor: available ? 'pointer' : 'default'
              }}
              title={available && dateInfo ? `${formatDate(dateInfo.date)} - ${dateInfo.host}${dateInfo.notes ? ' - ' + dateInfo.notes : ''}` : ''}
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Speaker Access View with improved UI
const SpeakerAccessView = ({ speaker, availableDates, onAccept, onDecline, formatDate }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [talkTitle, setTalkTitle] = useState('');
  const [talkAbstract, setTalkAbstract] = useState('');
  const [wordCount, setWordCount] = useState(0);

  const handleAbstractChange = (e) => {
    const text = e.target.value;
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length <= 500) {
      setTalkAbstract(text);
      setWordCount(words.length);
    }
  };

  if (speaker.status === 'Accepted') {
    return (
      <div style={styles.speakerContainer}>
        <div style={styles.speakerBox}>
          <h2 style={styles.speakerTitle}>✓ Invitation Accepted</h2>
          <p>Thank you, {speaker.full_name}! Your presentation has been confirmed.</p>
          <p>The organizers will contact you shortly about travel arrangements.</p>
        </div>
      </div>
    );
  }

  if (speaker.status === 'Declined') {
    return (
      <div style={styles.speakerContainer}>
        <div style={styles.speakerBox}>
          <h2 style={styles.speakerTitle}>Invitation Declined</h2>
          <p>Thank you for your response, {speaker.full_name}.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedDate || !talkTitle.trim()) {
      alert('Please select a date and enter a talk title');
      return;
    }
    onAccept(selectedDate, talkTitle, talkAbstract);
  };

  const availableDatesForSpeaker = availableDates.filter(d => d.available && d.locked_by_id !== 'DELETED');
  const selectedDateInfo = availableDatesForSpeaker.find(d => d.id === selectedDate);

  return (
    <div style={styles.speakerContainer}>
      <div style={{...styles.speakerBox, maxWidth: '800px'}}>
        <h2 style={styles.speakerTitle}>Seminar Invitation</h2>
        <p style={styles.speakerText}>Dear {speaker.full_name},</p>
        <p style={styles.speakerText}>
          We are delighted to invite you to present a seminar at the Collaboratorium for Theoretical Modelling and Predictive Biology in Barcelona.
        </p>
        <p style={styles.speakerText}>Your host will be: <strong>{speaker.host}</strong></p>

        <form onSubmit={handleSubmit} style={styles.speakerForm}>
          <label style={styles.labelLarge}>Talk Title *</label>
          <input
            type="text"
            value={talkTitle}
            onChange={(e) => setTalkTitle(e.target.value)}
            style={{
              ...styles.input, 
              fontSize: '16px', 
              padding: '14px',
              width: '100%',
              boxSizing: 'border-box'
            }}
            placeholder="Enter your talk title"
            required
          />

          <label style={styles.labelLarge}>
            Talk Abstract (Optional - max 500 words)
            <span style={{float: 'right', fontSize: '14px', color: wordCount > 450 ? '#e74c3c' : '#666'}}>
              {wordCount}/500 words
            </span>
          </label>
          <textarea
            value={talkAbstract}
            onChange={handleAbstractChange}
            style={{
              ...styles.input,
              minHeight: '180px',
              resize: 'vertical',
              fontSize: '15px',
              lineHeight: '1.6',
              width: '100%',
              boxSizing: 'border-box'
            }}
            placeholder="Enter a brief abstract of your talk"
          />

          <label style={styles.labelLarge}>Select Available Date *</label>
          <CalendarDatePicker
            availableDates={availableDatesForSpeaker}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            formatDate={formatDate}
          />

          {selectedDateInfo && (
            <div style={styles.selectedDateInfo}>
              <strong>Selected Date:</strong> {formatDate(selectedDateInfo.date)} - {selectedDateInfo.host}
              {selectedDateInfo.notes && <span> ({selectedDateInfo.notes})</span>}
            </div>
          )}

          <div style={styles.buttonGroup}>
            <button type="submit" style={{...styles.submitBtn, ...styles.acceptBtn, fontSize: '16px', padding: '14px'}}>
              Accept Invitation
            </button>
            <button 
              type="button" 
              onClick={onDecline} 
              style={{...styles.submitBtn, ...styles.declineBtn, fontSize: '16px', padding: '14px'}}>
              Decline
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

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
    width: '700px',
    backgroundColor: 'white',
    borderLeft: '1px solid #ddd',
    boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 120px)',
    position: 'sticky',
    top: '120px',
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

export default App;