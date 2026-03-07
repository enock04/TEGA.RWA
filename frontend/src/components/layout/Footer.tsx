import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <span className="text-white font-bold">TEGA.Rw</span>
            </div>
            <p className="text-sm leading-relaxed">
              Rwanda&apos;s trusted inter-provincial bus ticketing platform.
              Book your seat online in seconds.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/search" className="hover:text-white transition-colors">Search Buses</Link></li>
              <li><Link href="/auth/register" className="hover:text-white transition-colors">Create Account</Link></li>
              <li><Link href="/auth/login" className="hover:text-white transition-colors">Sign In</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition-colors">My Bookings</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>Email: <a href="mailto:support@tega.rw" className="hover:text-white">support@tega.rw</a></li>
              <li>Phone: <a href="tel:+250700000000" className="hover:text-white">+250 700 000 000</a></li>
              <li className="text-xs pt-2">Mon–Fri, 7:00 AM – 8:00 PM</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-xs">
          &copy; {new Date().getFullYear()} TEGA.Rw. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
