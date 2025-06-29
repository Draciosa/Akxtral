import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Download, Share2, Calendar, Clock, MapPin, CreditCard, QrCode, ArrowLeft } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import html2canvas from 'html2canvas';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

interface BookingReceiptProps {
  booking?: {
    id: string;
    cardTitle: string;
    cardType: string;
    date: string;
    timeSlots: string[];
    pricePerHour: number;
    totalAmount: number;
    openSlots?: number;
    perSlotPrice?: number;
    joinedSlots?: number;
    originalBookingId?: string;
    userEmail: string;
    bookingTime: Date;
    location?: string;
  };
  onClose?: () => void;
  isModal?: boolean;
}

const BookingReceipt: React.FC<BookingReceiptProps> = ({ booking: propBooking, onClose, isModal = true }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(propBooking);
  const [loading, setLoading] = useState(!propBooking);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [receiptImageUrl, setReceiptImageUrl] = useState('');

  useEffect(() => {
    if (!propBooking && id) {
      fetchBookingData();
    }
  }, [id, propBooking]);

  useEffect(() => {
    if (booking) {
      generateReceiptImage();
    }
  }, [booking]);

  const fetchBookingData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const bookingDoc = await getDoc(doc(db, 'bookings', id));
      
      if (bookingDoc.exists()) {
        const bookingData = bookingDoc.data();
        
        // Fetch card details
        const cardDoc = await getDoc(doc(db, 'cards', bookingData.cardId));
        let cardData = {};
        if (cardDoc.exists()) {
          cardData = cardDoc.data();
        }

        // Fetch user details
        const userDoc = await getDoc(doc(db, 'users', bookingData.userId));
        let userEmail = 'user@example.com';
        if (userDoc.exists()) {
          const userData = userDoc.data();
          userEmail = userData.email || userEmail;
        }

        // Check if this is an open slot booking (has joinedSlots or originalBookingId)
        const isOpenSlotBooking = bookingData.joinedSlots || bookingData.originalBookingId;
        
        let totalAmount = 0;
        let timeSlots = [];
        let perSlotPrice = 0;
        
        if (isOpenSlotBooking) {
          // For open slot bookings, calculate based on joined slots and per slot price
          const joinedSlots = bookingData.joinedSlots || 1;
          
          // Get per slot price from the booking data or original booking
          perSlotPrice = bookingData.perSlotPrice || 0;
          
          if (!perSlotPrice && bookingData.originalBookingId) {
            try {
              const originalBookingDoc = await getDoc(doc(db, 'bookings', bookingData.originalBookingId));
              if (originalBookingDoc.exists()) {
                const originalData = originalBookingDoc.data();
                perSlotPrice = originalData.perSlotPrice || 0;
              }
            } catch (error) {
              console.error('Error fetching original booking:', error);
            }
          }
          
          totalAmount = joinedSlots * perSlotPrice;
          timeSlots = [bookingData.timeSlot]; // Single time slot for joined booking
        } else {
          // For regular bookings, use card price per hour
          totalAmount = cardData.pricePerHour || 0;
          timeSlots = [bookingData.timeSlot]; // Single time slot for individual booking
          perSlotPrice = bookingData.perSlotPrice || 0;
        }

        const formattedBooking = {
          id: bookingDoc.id,
          cardTitle: cardData.title || 'Unknown Card',
          cardType: cardData.type || 'Unknown Type',
          date: bookingData.date,
          timeSlots: timeSlots,
          pricePerHour: cardData.pricePerHour || 0,
          totalAmount: totalAmount,
          openSlots: bookingData.openSlots || 0,
          perSlotPrice: perSlotPrice,
          joinedSlots: bookingData.joinedSlots || 0,
          originalBookingId: bookingData.originalBookingId || '',
          userEmail: userEmail,
          bookingTime: bookingData.bookingTime?.toDate() || new Date(),
          location: cardData.location || ''
        };

        setBooking(formattedBooking);
      }
    } catch (error) {
      console.error('Error fetching booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReceiptImage = async () => {
    if (!booking) return;

    try {
      // Create a temporary div with the receipt content
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '400px';
      tempDiv.style.padding = '20px';
      tempDiv.style.backgroundColor = 'white';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      
      const isOpenSlotBooking = booking.joinedSlots && booking.joinedSlots > 0;
      const hasOpenSlots = booking.openSlots && booking.openSlots > 0 && !isOpenSlotBooking;
      
      tempDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #059669; margin: 0;">Booking Confirmed!</h2>
          <p style="color: #6b7280; margin: 5px 0;">TURFION</p>
        </div>
        
        <div style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">${booking.cardTitle}</h3>
          <p style="margin: 5px 0; color: #6b7280;"><strong>Type:</strong> ${booking.cardType}</p>
          <p style="margin: 5px 0; color: #6b7280;"><strong>Date:</strong> ${formatDate(booking.date)}</p>
          <p style="margin: 5px 0; color: #6b7280;"><strong>Time:</strong> ${booking.timeSlots.join(', ')}</p>
          ${booking.location ? `<p style="margin: 5px 0; color: #6b7280;"><strong>Location:</strong> ${booking.location}</p>` : ''}
          ${isOpenSlotBooking ? `<p style="margin: 5px 0; color: #059669;"><strong>Slots Joined:</strong> ${booking.joinedSlots}</p>` : ''}
          ${hasOpenSlots ? `<p style="margin: 5px 0; color: #059669;"><strong>Open Slots Created:</strong> ${booking.openSlots} @ ₹${booking.perSlotPrice}/slot</p>` : ''}
        </div>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 15px;">
          <p style="margin: 5px 0; color: #6b7280;"><strong>Total Amount:</strong> <span style="color: #059669; font-size: 18px;">₹${booking.totalAmount}</span></p>
          <p style="margin: 5px 0; color: #6b7280; font-size: 12px;">Booking ID: ${booking.id.slice(-8).toUpperCase()}</p>
          <p style="margin: 5px 0; color: #6b7280; font-size: 12px;">Booked by: ${booking.userEmail}</p>
          <p style="margin: 5px 0; color: #6b7280; font-size: 12px;">Booked: ${formatTime(booking.bookingTime)}</p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding: 10px; background-color: #f3f4f6; border-radius: 8px;">
          <p style="margin: 0; font-size: 12px; color: #6b7280;">Show this receipt at the venue</p>
        </div>
      `;
      
      document.body.appendChild(tempDiv);
      
      // Generate image from the div
      const canvas = await html2canvas(tempDiv, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      
      // Remove the temporary div
      document.body.removeChild(tempDiv);
      
      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            // Upload to Firebase Storage
            const storageRef = ref(storage, `receipts/${booking.id}.png`);
            await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(storageRef);
            
            setReceiptImageUrl(downloadURL);
            
            // Generate QR code URL pointing to the receipt image
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(downloadURL)}`;
            setQrCodeUrl(qrUrl);
          } catch (error) {
            console.error('Error uploading receipt image:', error);
            // Fallback to regular QR code
            const fallbackQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/receipt/${booking.id}`)}`;
            setQrCodeUrl(fallbackQrUrl);
          }
        }
      }, 'image/png');
      
    } catch (error) {
      console.error('Error generating receipt image:', error);
      // Fallback to regular QR code
      const fallbackQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/receipt/${booking.id}`)}`;
      setQrCodeUrl(fallbackQrUrl);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleDownload = () => {
    if (receiptImageUrl) {
      const link = document.createElement('a');
      link.href = receiptImageUrl;
      link.download = `booking-receipt-${booking?.id}.png`;
      link.click();
    } else {
      window.print();
    }
  };

  const handleShare = async () => {
    const shareUrl = receiptImageUrl || `${window.location.origin}/receipt/${booking?.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Booking Confirmation',
          text: `Booking confirmed for ${booking?.cardTitle} on ${formatDate(booking?.date || '')}`,
          url: shareUrl
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      alert('Booking receipt link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Booking Not Found</h2>
          <p className="text-gray-600 mb-6">The booking receipt you're looking for could not be found.</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const isOpenSlotBooking = booking.joinedSlots && booking.joinedSlots > 0;

  const ReceiptContent = () => (
    <div className="space-y-6">
      {/* Success Message */}
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Successful</h3>
        <p className="text-gray-600">Your booking has been confirmed</p>
      </div>

      {/* QR Code */}
      {qrCodeUrl && (
        <div className="text-center bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-center mb-2">
            <QrCode className="w-5 h-5 text-gray-600 mr-2" />
            <span className="text-sm font-medium text-gray-700">Booking QR Code</span>
          </div>
          <img 
            src={qrCodeUrl} 
            alt="Booking QR Code" 
            className="mx-auto mb-2 border border-gray-200 rounded"
          />
          <p className="text-xs text-gray-500">Scan this QR code to view receipt image</p>
        </div>
      )}

      {/* Booking Details */}
      <div className="space-y-4">
        <div className="border-b border-gray-200 pb-4">
          <h4 className="font-semibold text-gray-900 mb-3">Booking Details</h4>
          
          <div className="space-y-3">
            <div className="flex items-center">
              <MapPin className="w-4 h-4 text-gray-400 mr-3" />
              <div>
                <p className="font-medium text-gray-900">{booking.cardTitle}</p>
                <p className="text-sm text-gray-600">{booking.cardType}</p>
                {booking.location && (
                  <p className="text-sm text-gray-500">{booking.location}</p>
                )}
              </div>
            </div>

            <div className="flex items-center">
              <Calendar className="w-4 h-4 text-gray-400 mr-3" />
              <div>
                <p className="font-medium text-gray-900">{formatDate(booking.date)}</p>
              </div>
            </div>

            <div className="flex items-center">
              <Clock className="w-4 h-4 text-gray-400 mr-3" />
              <div>
                {booking.timeSlots?.filter(Boolean).length > 0 && (
  <p className="font-medium text-gray-900">
    {booking.timeSlots.filter(Boolean).join(', ')}
  </p>
)}

              </div>
            </div>

            {Number(booking.joinedSlots) > 0 && (
  <div className="flex items-center">
    <div className="w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
    <div>
      <p className="font-medium text-gray-900">{Number(booking.joinedSlots)} Slots Joined</p>
      <p className="text-sm text-gray-600">Joined existing game</p>
    </div>
  </div>
)}


            {Number(booking.openSlots) > 0 && Number(booking.joinedSlots) === 0 && (

              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                <div>
                  <p className="font-medium text-gray-900">{booking.openSlots} Open Slots Created</p>
                  <p className="text-sm text-gray-600">Available for other players</p>
                  {booking.perSlotPrice && booking.perSlotPrice > 0 && (
                    <p className="text-sm text-green-600">₹{booking.perSlotPrice} per slot</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="border-b border-gray-200 pb-4">
          <h4 className="font-semibold text-gray-900 mb-3">Payment Summary</h4>
          
          <div className="space-y-2">
            {isOpenSlotBooking ? (
              // For open slot bookings, show slots and per slot price
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Slots joined</span>
                  <span className="text-gray-900">{booking.joinedSlots}</span>
                </div>
                {booking.perSlotPrice && booking.perSlotPrice > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price per slot</span>
                    <span className="text-gray-900">₹{booking.perSlotPrice}</span>
                  </div>
                )}
              </>
            ) : (
              // For regular bookings, show price per hour and time slots
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Price per hour</span>
                  <span className="text-gray-900">₹{booking.pricePerHour}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Number of time slots booked</span>
                  <span className="text-gray-900">{booking.timeSlots.length}</span>
                </div>
                {booking.openSlots && booking.openSlots > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Open slots created</span>
                    <span className="text-gray-900">{booking.openSlots}</span>
                  </div>
                )}
                {booking.openSlots && booking.openSlots > 0 && booking.perSlotPrice && booking.perSlotPrice > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Open slots revenue potential</span>
                    <span className="text-green-600">₹{booking.openSlots * booking.perSlotPrice}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between font-semibold text-lg border-t border-gray-200 pt-2">
              <span className="text-gray-900">Total Amount</span>
              <span className="text-green-600">₹{booking.totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Booking Info */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Booking Information</h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Booking ID</span>
              <span className="text-gray-900 font-mono">{booking.id.slice(-8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Booked by</span>
              <span className="text-gray-900">{booking.userEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Booking time</span>
              <span className="text-gray-900">{formatTime(booking.bookingTime)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={handleDownload}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center justify-center"
        >
          <Download className="w-5 h-5 mr-2" />
          Download Receipt
        </button>
        <button
          onClick={handleShare}
          className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium flex items-center justify-center"
        >
          <Share2 className="w-5 h-5 mr-2" />
          Share Booking
        </button>
      </div>

      {/* Footer Note */}
      <div className="text-center text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        <p>Please save this receipt for your records.</p>
        <p>Show the QR code at the venue for verification.</p>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-green-600">Booking Confirmed!</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Receipt Content */}
          <div className="p-6">
            <ReceiptContent />
          </div>
        </div>
      </div>
    );
  }

  // Page view
  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/')}
        className="mb-6 inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200 font-medium"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to home
      </button>

      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 text-center">
          <h1 className="text-2xl font-bold text-green-600">Booking Receipt</h1>
        </div>

        {/* Receipt Content */}
        <div className="p-6">
          <ReceiptContent />
        </div>
      </div>
    </div>
  );
};

export default BookingReceipt;