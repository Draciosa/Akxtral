import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';

type CardData = {
  id: string;
  title: string;
  imageUrl: string;
  type: string;
  openingTime: string;
  closingTime: string;
  userId: string;
  createdAt: any;
};

const CARDS_PER_PAGE = 9;

export default function CommunityCards() {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCards, setTotalCards] = useState(0);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisible, setFirstVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const navigate = useNavigate();

  const totalPages = Math.ceil(totalCards / CARDS_PER_PAGE);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupRealtimeListener = () => {
      try {
        setLoading(true);
        setError('');
        
        // Create a real-time query for the first page
        const q = query(
          collection(db, 'cards'),
          orderBy('createdAt', 'desc'),
          limit(CARDS_PER_PAGE)
        );

        // Set up real-time listener
        unsubscribe = onSnapshot(q, (querySnapshot) => {
          const cardsData: CardData[] = [];
          
          querySnapshot.forEach((doc) => {
            cardsData.push({
              id: doc.id,
              ...doc.data()
            } as CardData);
          });

          setCards(cardsData);
          
          // Set pagination markers
          if (querySnapshot.docs.length > 0) {
            setFirstVisible(querySnapshot.docs[0]);
            setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
          }

          setLoading(false);
        }, (err) => {
          console.error('Error in real-time listener:', err);
          setError('Unable to load community cards at the moment.');
          setLoading(false);
        });

        // Get total count for pagination (separate query)
        const getTotalCount = async () => {
          try {
            const countQuery = query(collection(db, 'cards'));
            const countSnapshot = await getDocs(countQuery);
            setTotalCards(countSnapshot.size);
          } catch (err) {
            console.error('Error getting total count:', err);
          }
        };

        getTotalCount();

        // Set up a separate listener for total count updates
        const countUnsubscribe = onSnapshot(collection(db, 'cards'), (snapshot) => {
          setTotalCards(snapshot.size);
        });

        // Return cleanup function that unsubscribes from both listeners
        return () => {
          if (unsubscribe) unsubscribe();
          countUnsubscribe();
        };

      } catch (err) {
        console.error('Error setting up real-time listener:', err);
        setError('Unable to load community cards at the moment.');
        setLoading(false);
      }
    };

    const cleanup = setupRealtimeListener();

    // Cleanup function
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const handleNextPage = async () => {
    if (currentPage >= totalPages || !lastVisible) return;

    try {
      setLoading(true);
      const q = query(
        collection(db, 'cards'),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(CARDS_PER_PAGE)
      );

      const querySnapshot = await getDocs(q);
      const cardsData: CardData[] = [];
      
      querySnapshot.forEach((doc) => {
        cardsData.push({
          id: doc.id,
          ...doc.data()
        } as CardData);
      });

      setCards(cardsData);
      setCurrentPage(prev => prev + 1);
      
      if (querySnapshot.docs.length > 0) {
        setFirstVisible(querySnapshot.docs[0]);
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      }
    } catch (err) {
      console.error('Error fetching next page:', err);
      setError('Failed to load next page.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevPage = async () => {
    if (currentPage <= 1) return;

    try {
      setLoading(true);
      
      // For previous page, we need to calculate the offset
      const offset = (currentPage - 2) * CARDS_PER_PAGE;
      
      let q;
      if (offset === 0) {
        // First page
        q = query(
          collection(db, 'cards'),
          orderBy('createdAt', 'desc'),
          limit(CARDS_PER_PAGE)
        );
      } else {
        // Get all cards up to the desired page and take the last batch
        const allQuery = query(
          collection(db, 'cards'),
          orderBy('createdAt', 'desc'),
          limit(offset + CARDS_PER_PAGE)
        );
        
        const allSnapshot = await getDocs(allQuery);
        const allDocs = allSnapshot.docs;
        
        // Take the last CARDS_PER_PAGE documents
        const startIndex = Math.max(0, allDocs.length - CARDS_PER_PAGE);
        const pageCards = allDocs.slice(startIndex);
        
        const cardsData: CardData[] = pageCards.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as CardData));

        setCards(cardsData);
        setCurrentPage(prev => prev - 1);
        
        if (pageCards.length > 0) {
          setFirstVisible(pageCards[0]);
          setLastVisible(pageCards[pageCards.length - 1]);
        }
        setLoading(false);
        return;
      }

      const querySnapshot = await getDocs(q);
      const cardsData: CardData[] = [];
      
      querySnapshot.forEach((doc) => {
        cardsData.push({
          id: doc.id,
          ...doc.data()
        } as CardData);
      });

      setCards(cardsData);
      setCurrentPage(prev => prev - 1);
      
      if (querySnapshot.docs.length > 0) {
        setFirstVisible(querySnapshot.docs[0]);
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      }
    } catch (err) {
      console.error('Error fetching previous page:', err);
      setError('Failed to load previous page.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && cards.length === 0) {
    return (
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Community Cards</h2>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Community Cards</h2>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg">
          <p>{error}</p>
          <p className="text-sm mt-1">Please try refreshing the page or contact support if the issue persists.</p>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Community Cards</h2>
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">No community cards available yet.</p>
          <p className="text-gray-400 text-sm mt-2">Be the first to create and share a card!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Community Cards</h2>
        <div className="text-sm text-gray-600">
          Showing {((currentPage - 1) * CARDS_PER_PAGE) + 1}-{Math.min(currentPage * CARDS_PER_PAGE, totalCards)} of {totalCards} cards
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {cards.map((card) => (
          <div 
            key={card.id} 
            className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105"
            onClick={() => navigate(`/card/${card.id}`)}
          >
            <div className="relative h-48 bg-gray-200">
              <img 
                src={card.imageUrl} 
                alt={card.title} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.pexels.com/photos/3657154/pexels-photo-3657154.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';
                }}
              />
              <div className="absolute top-2 left-2 bg-green-600 text-white px-2 py-1 rounded text-sm">
                Community
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{card.title}</h3>
              <div className="flex items-center justify-between mb-3">
                <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                  {card.type}
                </span>
                <span className="text-gray-500 text-sm">
                  {card.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently added'}
                </span>
              </div>
              
              {/* Opening and Closing Times */}
              {(card.openingTime || card.closingTime) && (
                <div className="flex items-center text-gray-600 text-sm mt-2">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>
                    {card.openingTime && card.closingTime 
                      ? `${card.openingTime} - ${card.closingTime}`
                      : card.openingTime || card.closingTime
                    }
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1 || loading}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </button>
          
          <div className="flex items-center space-x-2">
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => {
                    // For now, we'll just show the current implementation
                    // A full implementation would require more complex pagination logic
                  }}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    pageNum === currentPage
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages || loading}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      )}
    </div>
  );
}