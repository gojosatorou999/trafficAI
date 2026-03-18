import { NavLink } from 'react-router-dom';
import { ShieldAlert, Ambulance, Activity, Bus, Radio, Bell } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Activity },
  { name: 'Highway Safety', href: '/highway', icon: ShieldAlert },
  { name: 'Green Corridor', href: '/corridor', icon: Ambulance },
  { name: 'Public Transport', href: '/transport', icon: Bus },
  { name: 'Narrator Logs', href: '/narrator', icon: Radio },
  { name: 'SOS Monitor', href: '/sos-monitor', icon: Bell },
];

export default function Sidebar() {
  return (
    <div className="flex h-full flex-col bg-slate-900 overflow-y-auto">
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-slate-800">
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
          IntelliMobility AI
        </span>
      </div>
      <nav className="flex flex-1 flex-col p-4">
        <ul role="list" className="flex flex-1 flex-col gap-y-4">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    className={({ isActive }) =>
                      `group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors ${
                        isActive
                          ? 'bg-slate-800 text-teal-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={`h-5 w-5 shrink-0 ${
                            isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-white'
                          }`}
                          aria-hidden="true"
                        />
                        {item.name}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </li>
          <li className="mt-auto">
            <div className="flex items-center gap-x-4 px-2 py-3 text-xs font-semibold leading-6 text-slate-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              System Online (Gemini 2.5)
            </div>
          </li>
        </ul>
      </nav>
    </div>
  );
}
